import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/extensionAuth";
import { corsJson, preflight } from "@/lib/extensionCors";
import { parseFocusTag } from "@/lib/focusTags";
import { getCatalog } from "@/lib/patterns";
import { buildPatternView, splitPatternProblems, type MatchableProblem } from "@/lib/patterns/match";
import { computeRecall } from "@/lib/fsrs";
import { buildPatternFocusLists, byRecallAsc, type ProblemRow, type UnsolvedRow } from "@/lib/extensionFocus";

interface ActiveFocusSummary {
  kind: "pattern" | "skill";
  value: string;
  label: string;
  count: number;
  problems: ProblemRow[]; // the agenda: due-only
  unsolved: UnsolvedRow[];
}

/** Computes the active-focus label, queue count, and problem rows for the popup. */
async function computeActiveFocus(
  userId: string,
  activeFocus: string | null | undefined,
  now: Date
): Promise<ActiveFocusSummary | null> {
  const tag = activeFocus ? parseFocusTag(activeFocus) : null;
  if (!tag) return null;

  if (tag.kind === "skill") {
    const problems = await prisma.problem.findMany({
      where: { userId, category: { has: tag.value } },
      select: { name: true, link: true, nextReviewDate: true, stability: true, lastReview: true },
    });
    const agenda: ProblemRow[] = problems
      .filter((p) => p.nextReviewDate != null && p.nextReviewDate <= now)
      .map((p) => ({ name: p.name, url: p.link, recall: computeRecall(p, now) }))
      .sort(byRecallAsc);
    return { kind: "skill", value: tag.value, label: tag.value, count: agenda.length, problems: agenda, unsolved: [] };
  }

  // pattern: match the user's problems to the catalog pattern (due + in-progress)
  const problems = await prisma.problem.findMany({
    where: { userId },
    select: {
      id: true, name: true, link: true, platform: true,
      nextReviewDate: true, lastRating: true, stability: true, lastReview: true,
    },
  });
  const matchable: MatchableProblem[] = problems;
  const view = buildPatternView(getCatalog(), matchable, now).find((v) => v.id === tag.value);
  if (!view) return null;
  const buckets = splitPatternProblems(view);

  // Recall lives on the user's Problem row, keyed by the view's problemId.
  const fsrsById = new Map(problems.map((p) => [p.id, p]));
  const recallFor = (problemId: string | null) => {
    const src = problemId ? fsrsById.get(problemId) : null;
    return src ? computeRecall(src, now) : 1;
  };
  const { agenda, unsolved } = buildPatternFocusLists(buckets, recallFor);
  return { kind: "pattern", value: tag.value, label: view.name, count: agenda.length, problems: agenda, unsolved };
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
      select: { dailyReviewLimit: true, activeFocus: true },
    });
    const limit = user?.dailyReviewLimit ?? 20;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const problems = await prisma.problem.findMany({
      where: { userId },
      select: { name: true, link: true, nextReviewDate: true, lastReview: true, stability: true },
    });

    let totalDue = 0;
    let reviewedToday = 0;
    const dueRows: ProblemRow[] = [];
    for (const p of problems) {
      if (p.nextReviewDate && p.nextReviewDate <= now) {
        totalDue++;
        dueRows.push({ name: p.name, url: p.link, recall: computeRecall(p, now) });
      }
      if (p.lastReview && p.lastReview >= todayStart && p.lastReview < todayEnd) reviewedToday++;
    }
    dueRows.sort(byRecallAsc);
    const cappedDue = Math.min(totalDue, limit);

    const activeFocus = await computeActiveFocus(userId, user?.activeFocus, now);

    // Pills mirror the review page: in a focus they describe the focus, not the
    // global queue (review/page.tsx scopes totalDue to the focus and forces
    // backlog to 0). Reviewed stays global, matching the website. Outside a
    // focus they fall back to the global due/backlog computation.
    const dueToday = activeFocus ? activeFocus.count : Math.max(0, cappedDue - reviewedToday);
    const backlog = activeFocus ? 0 : Math.max(0, totalDue - cappedDue);

    return corsJson(req, {
      success: true,
      dueToday,
      reviewedToday,
      backlog,
      // Focus meta drives the footer label + badge; problems is the rendered list.
      activeFocus: activeFocus
        ? { kind: activeFocus.kind, value: activeFocus.value, label: activeFocus.label, count: activeFocus.count }
        : null,
      problems: activeFocus ? activeFocus.problems : dueRows,
      // Pick-next list: present only in focus mode (catalog-backed); empty otherwise.
      unsolved: activeFocus ? activeFocus.unsolved : [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Summary failed";
    console.error("Extension summary error:", error);
    return corsJson(req, { success: false, message }, 500);
  }
}
