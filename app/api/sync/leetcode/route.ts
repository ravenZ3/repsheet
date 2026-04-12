import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

const LEETCODE_API_ENDPOINT = "https://leetcode.com/graphql";

export async function POST(req: NextRequest) {
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

    let synced = 0;
    let skipped = 0;
    // Delta Optimization via Pseudo-Cursor Timestamps
    const lastSyncTime = user.leetcodeLastSyncDate ? Math.floor(user.leetcodeLastSyncDate.getTime() / 1000) : 0;
    let newSyncTime = lastSyncTime;

    const newSubmissions = [];
    for (const sub of submissions) {
        const subTime = Number(sub.timestamp);
        if (subTime > lastSyncTime) {
            newSyncTime = Math.max(newSyncTime, subTime);
            newSubmissions.push(sub);
        }
    }

    // 2. Safely Upsert
    for (const sub of newSubmissions) {
      const slug = sub.titleSlug;
      if (!slug) continue;

      // Duplicate Checking (Strict No-Op to protect existing Repsheet metadata like notes and dates)
      const existing = await prisma.problem.findFirst({
        where: { userId: session.user.id, name: sub.title }
      });

      if (existing) {
        skipped++;
        continue;
      }

      // 3. Fallback: Request metadata like difficulty directly
      const qdQuery = {
        operationName: "questionData",
        variables: { titleSlug: slug },
        query: `query questionData($titleSlug: String!) { question(titleSlug: $titleSlug) { difficulty topicTags { name } } }`
      };

      const qdRes = await fetch(LEETCODE_API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Referer": "https://leetcode.com/" },
        body: JSON.stringify(qdQuery),
      });

      const qdData = await qdRes.json();
      const question = qdData?.data?.question;
      
      let difficulty = "Medium";
      let tags: string[] = [];
      if (question) {
        if (question.difficulty) difficulty = question.difficulty;
        if (question.topicTags) tags = question.topicTags.map((t: { name: string }) => t.name);
      }

      // 4. Create new DB record
      await prisma.problem.create({
        data: {
          userId: session.user.id,
          name: sub.title,
          platform: "LeetCode",
          link: `https://leetcode.com/problems/${slug}/`,
          difficulty: difficulty as "Easy" | "Medium" | "Hard",
          category: tags,
          dateSolved: new Date(Number(sub.timestamp) * 1000),
          isStuck: false,
          reviewCount: 0,
        }
      });
      synced++;
    }

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
    return NextResponse.json({ error: error.message || "Sync pipeline failed" }, { status: 500 });
  }
}
