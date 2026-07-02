import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { codeforcesHandle: true, codeforcesLastSyncId: true }
    });

    if (!user || !user.codeforcesHandle) {
      return NextResponse.json({ error: "No Codeforces handle configured." }, { status: 400 });
    }

    // Heavy pagination fetch grabbing up to last 1000 solves to cover substantial history dynamically
    const cfReq = await fetch(`https://codeforces.com/api/user.status?handle=${user.codeforcesHandle}&from=1&count=1000`);
    if (!cfReq.ok) throw new Error("Codeforces API rejected request");
    
    const cfData = await cfReq.json();
    if (cfData.status !== "OK") throw new Error(cfData.comment || "Codeforces fetch failed");

    const submissions = cfData.result;
    let synced = 0;
    let skipped = 0;
    
    const lastSyncCursor = user.codeforcesLastSyncId || 0;
    let newHighestCursor = lastSyncCursor;

    const acceptedSubmissions = [];
    for (const sub of submissions) {
        if (sub.id > lastSyncCursor) {
            newHighestCursor = Math.max(newHighestCursor, sub.id);
            if (sub.verdict === "OK") {
                acceptedSubmissions.push(sub);
            }
        }
    }
    
    // De-duplicate array by problem name natively before hitting database excessively
    const uniqueProblems = new Map();
    for (const sub of acceptedSubmissions) {
      const p = sub.problem;
      if (!p || !p.name) continue;
      // Keep the most recent accepted submission (Codeforces returns ordered newest->oldest)
      if (!uniqueProblems.has(p.name)) {
         uniqueProblems.set(p.name, sub);
      }
    }

    // Build candidate rows first, then dedupe against the DB in ONE query and
    // insert in ONE createMany — instead of a findFirst + create per problem.
    interface CfCandidate {
      name: string;
      link: string;
      rating: number | null;
      tags: string[];
      solvedAt: Date;
    }
    const candidates: CfCandidate[] = [];
    for (const [name, sub] of uniqueProblems.entries()) {
      const p = sub.problem;

      const contestId = p.contestId;
      const index = p.index;
      if (!contestId || !index) {
          skipped++;
          continue;
      }

      // Robust URL router differentiating between standard algorithmic contests vs Gyms
      const isGym = contestId >= 100000;
      const computedLink = isGym ? `https://codeforces.com/gym/${contestId}/problem/${index}` : `https://codeforces.com/contest/${contestId}/problem/${index}`;

      candidates.push({
        name,
        link: computedLink,
        rating: p.rating || null,
        tags: p.tags || [],
        solvedAt: new Date(Number(sub.creationTimeSeconds) * 1000),
      });
    }

    // Duplicate check keyed by link — the same key the extension capture and
    // LeetCode sync use — with a name fallback for legacy rows.
    const existing = candidates.length > 0 ? await prisma.problem.findMany({
      where: {
        userId: session.user.id,
        OR: [
          { link: { in: candidates.map((c) => c.link) } },
          { name: { in: candidates.map((c) => c.name) } },
        ],
      },
      select: { link: true, name: true },
    }) : [];
    const existingLinks = new Set(existing.map((e) => e.link));
    const existingNames = new Set(existing.map((e) => e.name));

    const toCreate = candidates.filter((c) => !existingLinks.has(c.link) && !existingNames.has(c.name));
    skipped += candidates.length - toCreate.length;

    if (toCreate.length > 0) {
      await prisma.problem.createMany({
        data: toCreate.map((c) => {
          // Elo extraction scaling
          let difficulty = "Medium";
          if (c.rating) {
            if (c.rating <= 1200) difficulty = "Easy";
            else if (c.rating >= 1900) difficulty = "Hard";
          }
          return {
            userId: session.user.id,
            name: c.name,
            platform: "Codeforces",
            link: c.link,
            difficulty: difficulty as "Easy" | "Medium" | "Hard",
            category: c.tags,
            dateSolved: c.solvedAt,
            nextReviewDate: c.solvedAt,
            isStuck: false,
            reviewCount: 0,
            platformRating: c.rating,
          };
        }),
      });
    }
    synced = toCreate.length;

    if (newHighestCursor > lastSyncCursor) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { codeforcesLastSyncId: newHighestCursor }
      });
    }

    return NextResponse.json({ success: true, synced, skipped }, { status: 200 });

  } catch (error: unknown) {
    console.error("Codeforces Sync error:", error);
    return NextResponse.json({ error: (error as Error).message || "Codeforces Sync pipeline failed" }, { status: 500 });
  }
}
