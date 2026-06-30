// --- STEP 1: Correct your imports ---
import prisma from '@/lib/prisma'; // Use the shared instance

import { NextRequest, NextResponse } from 'next/server';
import { scheduleReview, isReviewDue } from '@/lib/fsrs';
// Import authentication tools
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';

// REMOVE: const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  // --- STEP 2: Authenticate the user ---
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { id, rating } = await req.json();

    if (!id || typeof rating !== 'number' || rating < 1 || rating > 4) {
      return NextResponse.json({ error: 'Invalid problem ID or rating' }, { status: 400 });
    }

    // --- STEP 3: Securely find the problem ---
    // Fetch the problem only if it belongs to the logged-in user.
    const problem = await prisma.problem.findFirst({
      where: {
        id,
        userId: session.user.id, // <-- SECURITY CHECK
      },
      select: {
        stability: true,
        fsrsDifficulty: true,
        fsrsState: true,
        reviewCount: true,
        nextReviewDate: true,
        lastRating: true,
        lastReview: true,
      },
    });

    const userSettings = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { fsrsTargetRetention: true }
    });

    if (!problem) {
      return NextResponse.json({ error: 'Problem not found or you do not have permission' }, { status: 404 });
    }

    // --- Shared FSRS scheduling (see lib/fsrs.ts) ---
    const now = new Date();

    // Idempotency guard. Focused practice mode (skill/pattern) surfaces solved
    // problems regardless of their nextReviewDate, so a problem just rated today
    // stays on the card and could be re-rated — each re-rate would re-run FSRS
    // and append a Review, inflating stability/reviewCount. Only advance the
    // schedule for a genuinely-due (or never-scheduled) review; anything else is
    // a no-op. Done in a transaction with an optimistic guard on lastReview so
    // two concurrent clicks can't both schedule. Mirrors the capture endpoint.
    if (!isReviewDue(problem, now)) {
      return NextResponse.json(
        { success: true, deduped: true, nextReviewDate: problem.nextReviewDate },
        { status: 200 }
      );
    }

    const fsrsUpdate = scheduleReview(problem, rating, userSettings?.fsrsTargetRetention ?? undefined, now);

    const deduped = await prisma.$transaction(async (tx) => {
      // Optimistic guard: only the writer that still sees the reviewCount we read
      // wins; a racing duplicate updates 0 rows and becomes a no-op. We lock on
      // reviewCount (a non-null Int that changes every review), NOT lastReview —
      // Prisma+Mongo's `lastReview: null` filter matches no rows, so a
      // never-reviewed problem would always guard 0 and drop its first rating.
      const guard = await tx.problem.updateMany({
        where: {
          id,
          userId: session.user.id, // <-- SECURITY CHECK
          reviewCount: problem.reviewCount,
        },
        data: {
          ...fsrsUpdate,
          reviewCount: { increment: 1 },
        },
      });
      if (guard.count === 0) return true;

      await tx.review.create({
        data: {
          userId: session.user.id,
          problemId: id,
          date: now,
          rating,
        },
      });
      return false;
    });

    return NextResponse.json(
      { success: true, deduped, nextReviewDate: fsrsUpdate.nextReviewDate },
      { status: 200 }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to mark review';
    console.error('❌ Server error:', err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}