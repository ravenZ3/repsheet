import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { parseFocusTags, formatFocusTag, isValidFocusTag } from "@/lib/focusTags";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { dailyReviewLimit: true, leetcodeUsername: true, codeforcesHandle: true, fsrsTargetRetention: true, showPatterns: true, focusTags: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error("GET Settings Error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { dailyReviewLimit, leetcodeUsername, codeforcesHandle, fsrsTargetRetention, showPatterns, focusTags, activeFocus } = body;

    const updateData: Record<string, unknown> = {};
    // Active focus mirror for the extension: a well-formed kind:value tag sets
    // it, explicit null clears it. Written here (a deliberate client POST)
    // instead of during the review page's GET render, where Link prefetch
    // could flip it without a real visit.
    if (activeFocus === null) {
        updateData.activeFocus = null;
    } else if (typeof activeFocus === "string" && isValidFocusTag(activeFocus)) {
        updateData.activeFocus = activeFocus;
    }
    if (Array.isArray(focusTags)) {
        // Keep only well-formed, de-duplicated kind:value entries.
        updateData.focusTags = parseFocusTags(
          focusTags.filter((t): t is string => typeof t === "string")
        ).map(formatFocusTag);
    }
    if (typeof fsrsTargetRetention === 'number' && fsrsTargetRetention >= 0.70 && fsrsTargetRetention <= 0.99) {
        updateData.fsrsTargetRetention = fsrsTargetRetention;
    }
    if (typeof dailyReviewLimit === 'number' && dailyReviewLimit >= 1) {
        updateData.dailyReviewLimit = dailyReviewLimit;
    }
    if (typeof showPatterns === 'boolean') {
        updateData.showPatterns = showPatterns;
    }
    if (leetcodeUsername !== undefined) {
        updateData.leetcodeUsername = leetcodeUsername;
    }
    if (codeforcesHandle !== undefined) {
        const cleanHandle = codeforcesHandle.trim();
        if (cleanHandle !== '') {
            // Server-Side Codeforces Validation
            const cfRes = await fetch(`https://codeforces.com/api/user.info?handles=${cleanHandle}`);
            const cfData = await cfRes.json();
            if (cfData.status === "FAILED") {
                return NextResponse.json({ error: `Codeforces verification failed: ${cfData.comment || 'Handle not found'}` }, { status: 400 });
            }
        }
        updateData.codeforcesHandle = cleanHandle;
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: { dailyReviewLimit: true, leetcodeUsername: true, codeforcesHandle: true, showPatterns: true, focusTags: true }
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    console.error("PATCH Settings Error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
