import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

const LEETCODE_API_ENDPOINT = "https://leetcode.com/graphql";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { leetcodeUsername: true, leetcodeLastSyncDate: true }
    });

    if (!user || !user.leetcodeUsername) {
      return NextResponse.json({ error: "No LeetCode username configured. Please save your username first." }, { status: 400 });
    }

    // 1. Fetch recent AC submissions from LeetCode GraphQL
    const recentSubQuery = {
      operationName: "recentAcSubmissions",
      variables: { username: user.leetcodeUsername, limit: 20 },
      query: `query recentAcSubmissions($username: String!, $limit: Int!) { recentAcSubmissionList(username: $username, limit: $limit) { id title titleSlug timestamp } }`
    };

    const recentRes = await fetch(LEETCODE_API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Referer": "https://leetcode.com/" },
      body: JSON.stringify(recentSubQuery),
    });

    if (!recentRes.ok) throw new Error("Failed to fetch recent submissions from LeetCode.");
    const recentData = await recentRes.json();
    const submissions = recentData?.data?.recentAcSubmissionList;

    if (!submissions || !Array.isArray(submissions)) {
         throw new Error("Invalid response from LeetCode or username not found.");
    }

    // Delta Optimization via Pseudo-Cursor Timestamps
    const lastSyncTime = user.leetcodeLastSyncDate ? Math.floor(user.leetcodeLastSyncDate.getTime() / 1000) : 0;
    let newSyncTime = lastSyncTime;

    // The recent list can carry several ACs of the same problem (re-submits);
    // it's newest-first, so the first occurrence per slug wins. Dedupe here in
    // memory — the insert below is a single batched createMany.
    const newBySlug = new Map<string, { title: string; slug: string; timestamp: number }>();
    for (const sub of submissions) {
        const subTime = Number(sub.timestamp);
        if (subTime > lastSyncTime && sub.titleSlug) {
            newSyncTime = Math.max(newSyncTime, subTime);
            if (!newBySlug.has(sub.titleSlug)) {
                newBySlug.set(sub.titleSlug, { title: sub.title, slug: sub.titleSlug, timestamp: subTime });
            }
        }
    }

    const candidates = Array.from(newBySlug.values()).map((c) => ({
        ...c,
        link: `https://leetcode.com/problems/${c.slug}/`,
    }));

    // 2. Duplicate check in ONE query (strict no-op to protect existing Repsheet
    // metadata like notes and dates). Keyed by link — the same key the extension
    // capture and Codeforces sync use — with a name fallback so rows created by
    // the old name-keyed sync still dedupe.
    const existing = candidates.length > 0 ? await prisma.problem.findMany({
        where: {
            userId: session.user.id,
            OR: [
                { link: { in: candidates.map((c) => c.link) } },
                { name: { in: candidates.map((c) => c.title) } },
            ],
        },
        select: { link: true, name: true },
    }) : [];
    const existingLinks = new Set(existing.map((e) => e.link));
    const existingNames = new Set(existing.map((e) => e.name));

    const toCreate = candidates.filter((c) => !existingLinks.has(c.link) && !existingNames.has(c.title));
    const skipped = candidates.length - toCreate.length;

    // 3. Metadata (difficulty/tags) fetches in parallel instead of serially.
    const metadata = await Promise.all(toCreate.map(async (c) => {
        try {
            const qdRes = await fetch(LEETCODE_API_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Referer": "https://leetcode.com/" },
                body: JSON.stringify({
                    operationName: "questionData",
                    variables: { titleSlug: c.slug },
                    query: `query questionData($titleSlug: String!) { question(titleSlug: $titleSlug) { difficulty topicTags { name } } }`
                }),
            });
            const qdData = await qdRes.json();
            const question = qdData?.data?.question;
            return {
                difficulty: question?.difficulty || "Medium",
                tags: question?.topicTags?.map((t: { name: string }) => t.name) ?? [],
            };
        } catch {
            return { difficulty: "Medium", tags: [] as string[] };
        }
    }));

    // 4. Single batched insert
    if (toCreate.length > 0) {
        await prisma.problem.createMany({
            data: toCreate.map((c, i) => ({
                userId: session.user.id,
                name: c.title,
                platform: "LeetCode",
                link: c.link,
                difficulty: metadata[i].difficulty as "Easy" | "Medium" | "Hard",
                category: metadata[i].tags,
                dateSolved: new Date(c.timestamp * 1000),
                nextReviewDate: new Date(c.timestamp * 1000),
                isStuck: false,
                reviewCount: 0,
            })),
        });
    }
    const synced = toCreate.length;

    // Safely bump the high-water extraction cursor
    if (newSyncTime > lastSyncTime) {
        await prisma.user.update({
            where: { id: session.user.id },
            data: { leetcodeLastSyncDate: new Date(newSyncTime * 1000) }
        });
    }

    return NextResponse.json({ success: true, synced, skipped }, { status: 200 });

  } catch (error: unknown) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: (error as Error).message || "Sync pipeline failed" }, { status: 500 });
  }
}
