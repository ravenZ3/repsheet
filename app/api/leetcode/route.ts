import { NextResponse, NextRequest } from "next/server";
// --- STEP 1: Import authentication tools ---
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

// --- The rest of your code is excellent. We just need to wrap it in the security check. ---

// LeetCode API endpoints
const LEETCODE_API_ENDPOINT = "https://leetcode.com/graphql";
const LEETCODE_ALL_PROBLEMS_URL = "https://leetcode.com/api/problems/all/";

// Caching (see note below on serverless environments)
let problemMap: Map<string, string> | null = null;
let lastCacheTime: number | null = null;
const CACHE_DURATION = 1000 * 60 * 60; // Cache for 1 hour

interface LeetCodeProblemListItem {
  stat: {
    frontend_question_id: number;
    question__title_slug: string;
  };
}

async function getSlugFromId(id: string): Promise<string | null> {
  const now = Date.now();
  if (!problemMap || !lastCacheTime || now - lastCacheTime > CACHE_DURATION) {
    console.log("Refreshing LeetCode problem ID-to-slug cache...");
    try {
      const response = await fetch(LEETCODE_ALL_PROBLEMS_URL);
      if (!response.ok) throw new Error("Failed to fetch LeetCode problem list");
      const data = await response.json();
      const problems = data.stat_status_pairs as LeetCodeProblemListItem[];

      problemMap = new Map<string, string>();
      for (const problem of problems) {
        const frontendId = String(problem.stat.frontend_question_id);
        const slug = problem.stat.question__title_slug;
        problemMap.set(frontendId, slug);
      }
      lastCacheTime = now;
      console.log("Cache refreshed successfully.");
    } catch (error) {
      console.error("Error refreshing cache:", error);
      // Don't block requests if cache refresh fails; just use old cache if available
    }
  }
  return problemMap?.get(id) || null;
}

export async function POST(req: NextRequest) {
  // --- STEP 2: SECURE THE ENTIRE ROUTE ---
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }
  // --- END OF SECURITY CHECK ---

  try {
    // The rest of your logic can now proceed safely
    const body = await req.json();
    let { identifier } = body;

    if (!identifier || typeof identifier !== "string") {
      return NextResponse.json({ success: false, error: "Identifier is required" }, { status: 400 });
    }

    identifier = identifier.trim();
    let titleSlug = "";

    if (/^\d+$/.test(identifier)) {
      const slug = await getSlugFromId(identifier);
      if (!slug) {
        return NextResponse.json({ success: false, error: `Problem with ID ${identifier} not found` }, { status: 404 });
      }
      titleSlug = slug;
    } else {
      // Your logic for handling slugs
      const urlMatch = identifier.match(/leetcode\.com\/problems\/([^\/]+)/);
      titleSlug = urlMatch ? urlMatch[1] : identifier;
    }

    const query = {
      operationName: "questionData",
      variables: { titleSlug },
      query: `query questionData($titleSlug: String!) { question(titleSlug: $titleSlug) { questionId, questionFrontendId, title, titleSlug, isPaidOnly, difficulty, content, topicTags { name, slug } } }`,
    };

    const response = await fetch(LEETCODE_API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Referer": "https://leetcode.com/" },
      body: JSON.stringify(query),
    });

    if (!response.ok) {
      throw new Error(`LeetCode API responded with status ${response.status}`);
    }

    const result = await response.json();
    if (result.errors || !result.data.question) {
      return NextResponse.json({ success: false, error: "Problem not found on LeetCode" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.data.question });
  } catch (error) {
    console.error("API Error fetching LeetCode data:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}