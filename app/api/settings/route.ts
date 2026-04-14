import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { dailyReviewLimit: true, leetcodeUsername: true, codeforcesHandle: true, fsrsTargetRetention: true },
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
    const { dailyReviewLimit, leetcodeUsername, codeforcesHandle, fsrsTargetRetention } = body;

    const updateData: Record<string, unknown> = {};
    if (typeof fsrsTargetRetention === 'number' && fsrsTargetRetention >= 0.70 && fsrsTargetRetention <= 0.99) {
        updateData.fsrsTargetRetention = fsrsTargetRetention;
    }
    if (typeof dailyReviewLimit === 'number' && dailyReviewLimit >= 1) {
        updateData.dailyReviewLimit = dailyReviewLimit;
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
      select: { dailyReviewLimit: true, leetcodeUsername: true, codeforcesHandle: true }
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    console.error("PATCH Settings Error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
