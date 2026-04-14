import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    let { identifier } = body;

    if (!identifier || typeof identifier !== "string") {
      return NextResponse.json({ success: false, error: "Identifier is required" }, { status: 400 });
    }

    identifier = identifier.trim();
    let contestId = "";
    let index = "";

    // 1. Try URL parsing: e.g. https://codeforces.com/contest/1234/problem/A or problemset/problem/1234/A
    const urlMatch = identifier.match(/(?:contest|gym|problemset\/problem)\/(\d+)(?:\/problem)?\/([A-Za-z0-9]+)/i);
    if (urlMatch) {
      contestId = urlMatch[1];
      index = urlMatch[2].toUpperCase();
    } else {
      // 2. Try shortcode, e.g. 1234A or 123400A
      const shortCodeMatch = identifier.match(/^(\d+)([A-Za-z0-9]+)$/i);
      if (shortCodeMatch) {
        contestId = shortCodeMatch[1];
        index = shortCodeMatch[2].toUpperCase();
      }
    }

    if (!contestId || !index) {
        return NextResponse.json({ success: false, error: "Could not parse Codeforces contest ID and problem index from URL" }, { status: 400 });
    }
    
    // Hit the standings route which universally tracks all Gyms, Contests, and regular problem sets dynamically
    const cfReq = await fetch(`https://codeforces.com/api/contest.standings?contestId=${contestId}&from=1&count=1`);
    if (!cfReq.ok) {
        throw new Error("Codeforces API rejected request. Contest might not exist or isn't public.");
    }

    const cfData = await cfReq.json();
    if (cfData.status !== "OK") {
        throw new Error(cfData.comment || "Could not retrieve contest data");
    }

    const problems = cfData.result?.problems || [];
    const problem = problems.find((p: { index: string, name: string, rating: number, tags: string[] }) => p.index === index || p.index.toUpperCase() === index);

    if (!problem) {
        return NextResponse.json({ success: false, error: `Problem ${index} not found in Contest ${contestId}` }, { status: 404 });
    }

    // Prepare response matching the structure expected by the frontend (so it mimics the LeetCode extraction response logic elegantly)
    const rating = problem.rating || null;
    let difficulty = "Medium";
    if (rating) {
        if (rating <= 1200) difficulty = "Easy";
        else if (rating >= 1900) difficulty = "Hard";
    }

    const computedLink = parseInt(contestId) >= 100000 
        ? `https://codeforces.com/gym/${contestId}/problem/${index}`
        : `https://codeforces.com/contest/${contestId}/problem/${index}`;

    return NextResponse.json({ 
        success: true, 
        data: {
            title: problem.name,
            link: computedLink,
            difficulty: difficulty,
            tags: problem.tags || [],
            platformRating: rating,
            platform: "Codeforces"
        }
    });

  } catch (error: unknown) {
    console.error("API Error fetching Codeforces data:", error);
    return NextResponse.json({ success: false, error: (error as Error).message || "An unknown error occurred" }, { status: 500 });
  }
}
