import prisma from '@/lib/prisma'; 
import { Problem } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';
import ReviewPageContent from '@/components/ReviewPageContent';
// Import authentication tools
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';

// REMOVE: const prisma = new PrismaClient()

export default async function ReviewPage() {
  const today = new Date();

  // --- STEP 2: Get the user's session securely ---
  const session = await getServerSession(authOptions);

  // --- STEP 3: Protect the page ---
  // If the user is not logged in, they cannot access the review page.
  if (!session || !session.user?.id) {
    redirect('/login'); // Or your sign-in route
  }

  let problems: Problem[] = [];
  let totalCount = 0;
  let reviewedToday = 0; // Note: This query might not be what you intend, see below.
  let error: string | null = null;

  try {
    // --- STEP 4: Use the session ID in all database queries ---
    [problems, totalCount, reviewedToday] = await Promise.all([
      // Get problems due for review today or earlier
      prisma.problem.findMany({
        where: {
          userId: session.user.id, // <-- SECURITY FIX
          nextReviewDate: { lte: today },
        },
        orderBy: { nextReviewDate: 'asc' },
      }),
      // Get the total number of problems the user has
      prisma.problem.count({
        where: {
          userId: session.user.id, // <-- SECURITY FIX
        },
      }),
      // Get the number of problems that were/are scheduled for today
      prisma.problem.count({
        where: {
          userId: session.user.id, // <-- SECURITY FIX
          nextReviewDate: {
            gte: startOfDay(today),
            lte: endOfDay(today),
          },
        },
      }),
    ]);
  } catch (err) {
    console.error('[REVIEW_PAGE_ERROR]', err);
    error = err instanceof Error ? err.message : 'Failed to fetch review data';
  }

  return (
    <ReviewPageContent
      problems={problems}
      totalCount={totalCount}
      reviewedToday={reviewedToday}
      error={error}
    />
  );
}