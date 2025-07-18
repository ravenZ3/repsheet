import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { FSRS, Card, Rating } from 'fsrs.js';

const prisma = new PrismaClient();
const fsrs = new FSRS();

export async function POST(req: NextRequest) {
  try {
    const { id, rating } = await req.json();
    console.log('Received:', { id, rating });

    if (!id || typeof rating !== 'number' || rating < 1 || rating > 4) {
      return NextResponse.json({ error: 'Invalid problem ID or rating' }, { status: 400 });
    }

    const problem = await prisma.problem.findUnique({
      where: { id },
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
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }

    const now = new Date();
    const card = new Card();
    card.due = problem.nextReviewDate ?? now;
    card.last_review = problem.lastReview ?? now;
    card.stability = problem.stability ?? 2.5;
    card.difficulty = problem.fsrsDifficulty ?? 3.5;

    const ratingEnum = rating as Rating;
    const result = fsrs.repeat(card, now);
    const updatedCard = result[ratingEnum];

    console.log('FSRS result:', updatedCard.card);

    const updatedProblem = await prisma.problem.update({
      where: { id },
      data: {
        stability: updatedCard.card.stability,
        fsrsDifficulty: updatedCard.card.difficulty,
        lastRating: rating,
        lastReview: now,
        reviewCount: { increment: 1 },
        nextReviewDate: updatedCard.card.due,
        status: ratingEnum >= Rating.Good ? 'Solved' : 'Review',
      },
    });

    return NextResponse.json(updatedProblem, { status: 200 });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to mark review';
    console.error('❌ Server error:', err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}