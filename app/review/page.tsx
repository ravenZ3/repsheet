import prisma from '@/lib/prisma'; 
import { Problem } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';
import ReviewPageContent from '@/components/ReviewPageContent';
// Import authentication tools
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';

// REMOVE: const prisma = new PrismaClient()

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ topic?: string, state?: string }> }) {
  const today = new Date();
  
  const resolvedParams = await searchParams;
  const topicFilter = resolvedParams.topic;
  const stateFilter = resolvedParams.state;

  // --- STEP 2: Get the user's session securely ---
  const session = await getServerSession(authOptions);

  // --- STEP 3: Protect the page ---
  // If the user is not logged in, they cannot access the review page.
  if (!session || !session.user?.id) {
    redirect('/login'); // Or your sign-in route
  }

  let problems: Problem[] = [];
  let reviewedToday = 0; // Note: This query might not be what you intend, see below.
  let totalDue = 0;
  let limit = 20;
  let error: string | null = null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { dailyReviewLimit: true },
    });
    limit = user?.dailyReviewLimit || 20;

    reviewedToday = await prisma.problem.count({
      where: {
        userId: session.user.id,
        lastReview: {
          gte: startOfDay(today),
          lte: endOfDay(today),
        },
      },
    });

    const remainingQuota = Math.max(0, limit - reviewedToday);

    totalDue = await prisma.problem.count({
        where: {
            userId: session.user.id,
            ...(stateFilter === 'relearning' ? { fsrsState: 3 } : topicFilter ? { category: { has: topicFilter } } : { nextReviewDate: { lte: today } }),
        }
    });

    problems = remainingQuota > 0 || topicFilter || stateFilter === 'relearning' ? await prisma.problem.findMany({
        where: {
          userId: session.user.id,
          // If filtering by topic or relearning state, bypass the strict FSRS nextReviewDate timeline restriction
          ...(stateFilter === 'relearning' ? { fsrsState: 3 } : topicFilter ? { category: { has: topicFilter } } : { nextReviewDate: { lte: today } }),
        },
        orderBy: (topicFilter || stateFilter === 'relearning') ? { lastReview: 'asc' } : { nextReviewDate: 'asc' },
        take: (topicFilter || stateFilter === 'relearning') ? 50 : remainingQuota // Pull up to 50 items for focused practice mode
      }) : [];
  } catch (err) {
    console.error('[REVIEW_PAGE_ERROR]', err);
    error = err instanceof Error ? err.message : 'Failed to fetch review data';
  }

  const cappedDue = Math.min(totalDue, limit > 0 ? limit : totalDue);
  const backlog = Math.max(0, totalDue - cappedDue);

  return (
    <ReviewPageContent
      problems={problems}
      reviewedToday={reviewedToday}
      backlog={backlog}
      error={error}
      topicFocus={topicFilter}
    />
  );
}