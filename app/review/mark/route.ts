// --- STEP 1: Correct your imports ---
import prisma from '@/lib/prisma'; // Use the shared instance
import { Status } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { FSRS, Card, Rating } from 'fsrs.js';
// Import authentication tools
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';

// REMOVE: const prisma = new PrismaClient()
const fsrs = new FSRS();

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
        reviewCount: true,
        nextReviewDate: true,
        status: true,
        lastRating: true,
        lastReview: true,
      },
    });

    if (!problem) {
      return NextResponse.json({ error: 'Problem not found or you do not have permission' }, { status: 404 });
    }

    // --- Your FSRS logic is great, no changes needed here ---
    const now = new Date();
    const card = new Card();
    card.due = problem.nextReviewDate ?? now;
    card.last_review = problem.lastReview ?? now;
    card.stability = problem.stability ?? 2.5;
    card.difficulty = problem.fsrsDifficulty ?? 3.5;

    const ratingEnum = rating as Rating;
    // Note: fsrs.repeat() returns a schedule object, not an updated card directly.
    // The result is a dictionary mapping ratings to their outcomes.
    const schedule = fsrs.repeat(card, now);
    const updatedCardInfo = schedule[ratingEnum];

    // --- STEP 4: Securely update the problem ---
    // Use `updateMany` for an atomic and authorized update.
    const updateResult = await prisma.problem.updateMany({
      where: {
        id,
        userId: session.user.id, // <-- SECURITY CHECK
      },
      data: {
        stability: updatedCardInfo.card.stability,
        fsrsDifficulty: updatedCardInfo.card.difficulty,
        lastRating: rating,
        lastReview: now,
        reviewCount: { increment: 1 },
        nextReviewDate: updatedCardInfo.card.due,
        status: ratingEnum >= Rating.Good ? Status.Solved : Status.ToRevise,
      },
    });

    // STEP 5: Verify the update was successful
    if (updateResult.count === 0) {
      // This case is rare if the findFirst succeeded, but it's a good safeguard.
      return NextResponse.json({ error: 'Failed to update the problem' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to mark review';
    console.error('❌ Server error:', err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}