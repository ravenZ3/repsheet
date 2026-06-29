import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/extensionAuth";
import { corsJson, preflight } from "@/lib/extensionCors";

export async function OPTIONS(req: NextRequest) {
  return preflight(req);
}

/**
 * Lightweight summary for the extension badge + popup.
 * Mirrors the dashboard's due/reviewed computation (app/dashboard/page.tsx).
 */
export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return corsJson(req, { success: false, message: "Unauthorized" }, 401);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { dailyReviewLimit: true },
    });
    const limit = user?.dailyReviewLimit ?? 20;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const problems = await prisma.problem.findMany({
      where: { userId },
      select: { nextReviewDate: true, lastReview: true },
    });

    let totalDue = 0;
    let reviewedToday = 0;
    for (const p of problems) {
      if (p.nextReviewDate && p.nextReviewDate <= now) totalDue++;
      if (p.lastReview && p.lastReview >= todayStart && p.lastReview < todayEnd) reviewedToday++;
    }
    const cappedDue = Math.min(totalDue, limit);
    const dueToday = Math.max(0, cappedDue - reviewedToday);

    const recentReviews = await prisma.review.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 5,
      select: { rating: true, date: true, problem: { select: { name: true, platform: true } } },
    });

    const recent = recentReviews.map((r) => ({
      name: r.problem?.name ?? "Unknown",
      platform: r.problem?.platform ?? null,
      rating: r.rating,
      date: r.date,
    }));

    return corsJson(req, {
      success: true,
      dueToday,
      reviewedToday,
      backlog: Math.max(0, totalDue - cappedDue),
      recent,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Summary failed";
    console.error("Extension summary error:", error);
    return corsJson(req, { success: false, message }, 500);
  }
}
