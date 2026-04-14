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

      // Duplicate Checking relying strictly on application-layer logic (because MongoDB Index crashed earlier)
      const existing = await prisma.problem.findFirst({
        where: { userId: session.user.id, link: computedLink }
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Elo extraction scaling
      const rating = p.rating || null;
      let difficulty = "Medium";
      if (rating) {
        if (rating <= 1200) difficulty = "Easy";
        else if (rating >= 1900) difficulty = "Hard";
      }

      // Database Record Hydration
      await prisma.problem.create({
        data: {
          userId: session.user.id,
          name: name,
          platform: "Codeforces",
          link: computedLink,
          difficulty: difficulty as "Easy" | "Medium" | "Hard",
          category: p.tags || [],
          dateSolved: new Date(Number(sub.creationTimeSeconds) * 1000),
          isStuck: false,
          reviewCount: 0,
          platformRating: rating,
        }
      });
      synced++;
    }

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
