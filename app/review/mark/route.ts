// --- STEP 1: Correct your imports ---
import prisma from '@/lib/prisma'; // Use the shared instance

import { NextRequest, NextResponse } from 'next/server';
import { scheduleReview } from '@/lib/fsrs';
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
    const fsrsUpdate = scheduleReview(problem, rating, userSettings?.fsrsTargetRetention ?? undefined, now);

    // --- STEP 4: Securely update the problem ---
    // Use `updateMany` for an atomic and authorized update.
    const updateResult = await prisma.problem.updateMany({
      where: {
        id,
        userId: session.user.id, // <-- SECURITY CHECK
      },
      data: {
        ...fsrsUpdate,
        reviewCount: { increment: 1 },
      },
    });

    // STEP 5: Verify the update was successful
    if (updateResult.count === 0) {
      // This case is rare if the findFirst succeeded, but it's a good safeguard.
      return NextResponse.json({ error: 'Failed to update the problem' }, { status: 500 });
    }

    await prisma.review.create({
      data: {
        userId: session.user.id,
        problemId: id,
        date: now,
        rating,
      },
    })

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to mark review';
    console.error('❌ Server error:', err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}