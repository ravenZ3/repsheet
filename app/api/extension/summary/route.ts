import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/extensionAuth";
import { corsJson, preflight } from "@/lib/extensionCors";
import { parseFocusTag, parseFocusTags } from "@/lib/focusTags";
import { getCatalog } from "@/lib/patterns";
import { buildPatternView, splitPatternProblems, type MatchableProblem } from "@/lib/patterns/match";

interface ActiveFocusSummary {
  kind: "pattern" | "skill";
  value: string;
  label: string;
  count: number;
}

/** Computes the active-focus label + in-queue count, mirroring the review page. */
async function computeActiveFocus(
  userId: string,
  activeFocus: string | null | undefined,
  now: Date
): Promise<ActiveFocusSummary | null> {
  const tag = activeFocus ? parseFocusTag(activeFocus) : null;
  if (!tag) return null;

  if (tag.kind === "skill") {
    const count = await prisma.problem.count({
      where: { userId, category: { has: tag.value } },
    });
    return { kind: "skill", value: tag.value, label: tag.value, count };
  }

  // pattern: match the user's problems to the catalog pattern (due + in-progress)
  const problems = await prisma.problem.findMany({
    where: { userId },
    select: { id: true, name: true, link: true, platform: true, nextReviewDate: true, lastRating: true },
  });
  const matchable: MatchableProblem[] = problems;
  const view = buildPatternView(getCatalog(), matchable, now).find((v) => v.id === tag.value);
  if (!view) return null;
  const { due, inProgress } = splitPatternProblems(view);
  return { kind: "pattern", value: tag.value, label: view.name, count: due.length + inProgress.length };
}

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
      select: { dailyReviewLimit: true, activeFocus: true, focusTags: true },
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

    // Pinned focus chips for one-tap launch in the popup.
    const patternNames = new Map(getCatalog().patterns.map((p) => [p.id, p.name]));
    const focusChips = parseFocusTags(user?.focusTags ?? []).map((t) => ({
      kind: t.kind,
      value: t.value,
      label: t.kind === "pattern" ? patternNames.get(t.value) ?? t.value : t.value,
    }));

    const activeFocus = await computeActiveFocus(userId, user?.activeFocus, now);

    return corsJson(req, {
      success: true,
      dueToday,
      reviewedToday,
      backlog: Math.max(0, totalDue - cappedDue),
      focusChips,
      activeFocus,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Summary failed";
    console.error("Extension summary error:", error);
    return corsJson(req, { success: false, message }, 500);
  }
}
