import prisma from '@/lib/prisma';
import { Problem } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';
import ReviewPageContent, { type PracticeSuggestion } from '@/components/ReviewPageContent';
import FocusChips from '@/components/FocusChips';
// Import authentication tools
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import { getCatalog } from '@/lib/patterns';
import { buildPatternView, splitPatternProblems, type MatchableProblem } from '@/lib/patterns/match';
import { resolveFocusChips, type FocusChip } from '@/lib/focusChips';

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ topic?: string, state?: string, pattern?: string }> }) {
  const today = new Date();

  const resolvedParams = await searchParams;
  const topicFilter = resolvedParams.topic;
  const stateFilter = resolvedParams.state;
  const patternFilter = resolvedParams.pattern;

  // --- STEP 2: Get the user's session securely ---
  const session = await getServerSession(authOptions);

  // --- STEP 3: Protect the page ---
  if (!session || !session.user?.id) {
    redirect('/login');
  }

  let problems: Problem[] = [];
  let reviewedToday = 0;
  let totalDue = 0;
  let limit = 20;
  let error: string | null = null;
  let focusTitle: string | undefined;
  let suggestions: PracticeSuggestion[] = [];
  let focusChips: FocusChip[] = [];

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { dailyReviewLimit: true, focusTags: true },
    });
    limit = user?.dailyReviewLimit || 20;
    focusChips = resolveFocusChips(user?.focusTags ?? []);

    // Persist the active focus so the extension can mirror the review page's
    // current state. Pattern/skill focus sets it; global/relearning clears it.
    const activeFocus = patternFilter
      ? `pattern:${patternFilter}`
      : topicFilter
      ? `skill:${topicFilter}`
      : null;
    await prisma.user.update({
      where: { id: session.user.id },
      data: { activeFocus },
    });

    reviewedToday = await prisma.problem.count({
      where: {
        userId: session.user.id,
        lastReview: {
          gte: startOfDay(today),
          lte: endOfDay(today),
        },
      },
    });

    if (patternFilter) {
      // --- Pattern focused practice ---
      // Match the user's problems against the catalog pattern, then split into
      // due / in-progress (both rateable) and not-yet-solved (suggestions).
      const all = await prisma.problem.findMany({ where: { userId: session.user.id } });
      const matchable: MatchableProblem[] = all.map((p) => ({
        id: p.id,
        name: p.name,
        link: p.link,
        platform: p.platform,
        nextReviewDate: p.nextReviewDate,
        lastRating: p.lastRating,
      }));
      const view = buildPatternView(getCatalog(), matchable, today).find((v) => v.id === patternFilter);
      if (view) {
        focusTitle = view.name;
        const { due, inProgress, notSolved } = splitPatternProblems(view);
        const byId = new Map(all.map((p) => [p.id, p]));
        problems = [...due, ...inProgress]
          .map((cv) => (cv.problemId ? byId.get(cv.problemId) : null))
          .filter((p): p is Problem => Boolean(p));
        suggestions = notSolved.map((n) => ({ name: n.name, url: n.url, difficulty: n.difficulty }));
        totalDue = due.length;
      } else {
        error = 'Unknown pattern';
      }
    } else {
      // --- Global FSRS queue, or skill/relearning focus ---
      const remainingQuota = Math.max(0, limit - reviewedToday);

      totalDue = await prisma.problem.count({
        where: {
          userId: session.user.id,
          ...(stateFilter === 'relearning' ? { fsrsState: 3 } : topicFilter ? { category: { has: topicFilter } } : { nextReviewDate: { lte: today } }),
        },
      });

      problems = remainingQuota > 0 || topicFilter || stateFilter === 'relearning' ? await prisma.problem.findMany({
        where: {
          userId: session.user.id,
          // If filtering by topic or relearning state, bypass the strict FSRS nextReviewDate timeline restriction
          ...(stateFilter === 'relearning' ? { fsrsState: 3 } : topicFilter ? { category: { has: topicFilter } } : { nextReviewDate: { lte: today } }),
        },
        orderBy: (topicFilter || stateFilter === 'relearning') ? { lastReview: 'asc' } : { nextReviewDate: 'asc' },
        take: (topicFilter || stateFilter === 'relearning') ? 50 : remainingQuota, // Pull up to 50 items for focused practice mode
      }) : [];
    }
  } catch (err) {
    console.error('[REVIEW_PAGE_ERROR]', err);
    error = err instanceof Error ? err.message : 'Failed to fetch review data';
  }

  const cappedDue = Math.min(totalDue, limit > 0 ? limit : totalDue);
  const backlog = patternFilter ? 0 : Math.max(0, totalDue - cappedDue);

  const showChips = !topicFilter && !patternFilter && stateFilter !== 'relearning' && focusChips.length > 0;

  // Remount ReviewPageContent when the focus changes so its useState-derived
  // queue resets instead of showing the previous focus's stale problems.
  const focusKey = patternFilter
    ? `pattern:${patternFilter}`
    : topicFilter
    ? `topic:${topicFilter}`
    : stateFilter
    ? `state:${stateFilter}`
    : 'global';

  return (
    <>
      {showChips && (
        <div className="container mx-auto px-4 md:px-6 max-w-6xl pt-4">
          <FocusChips chips={focusChips} />
        </div>
      )}
      <ReviewPageContent
        key={focusKey}
        problems={problems}
        reviewedToday={reviewedToday}
        backlog={backlog}
        error={error}
        topicFocus={topicFilter}
        focusTitle={focusTitle}
        suggestions={suggestions}
      />
    </>
  );
}
