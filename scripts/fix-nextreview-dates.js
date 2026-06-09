// Backfill script: recalculate nextReviewDate for problems where the FSRS
// card.state was not set (bug), causing nextReviewDate to land minutes after
// lastReview instead of days/weeks out.
//
// Logic: re-run fsrs.repeat() with correct card state + lastRating to get the
// same result that should have been saved at review time.

const { PrismaClient } = require('@prisma/client');
const { FSRS, Card } = require('fsrs.js');

const prisma = new PrismaClient();

async function main() {
  const problems = await prisma.problem.findMany({
    where: {
      lastReview: { not: null },
      nextReviewDate: { not: null },
    },
    select: {
      id: true,
      name: true,
      userId: true,
      lastReview: true,
      nextReviewDate: true,
      fsrsState: true,
      stability: true,
      fsrsDifficulty: true,
      lastRating: true,
    },
  });

  const buggy = problems.filter((p) => {
    const diff = new Date(p.nextReviewDate) - new Date(p.lastReview);
    return diff < 60 * 60 * 1000; // less than 1 hour apart = buggy
  });

  console.log(`Found ${buggy.length} problems with incorrect nextReviewDate`);

  // Load per-user retention settings
  const userIds = [...new Set(buggy.map((p) => p.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, fsrsTargetRetention: true },
  });
  const retentionByUser = Object.fromEntries(
    users.map((u) => [u.id, u.fsrsTargetRetention])
  );

  let fixed = 0;
  for (const p of buggy) {
    if (!p.lastRating) {
      console.log(`  SKIP ${p.name} — no lastRating stored`);
      continue;
    }

    const fsrs = new FSRS();
    fsrs.p.maximum_interval = 365;
    const retention = retentionByUser[p.userId];
    if (retention) fsrs.p.request_retention = retention;

    const card = new Card();
    card.state = p.fsrsState ?? 0;
    card.due = p.lastReview; // card was due at review time
    card.last_review = p.lastReview;
    card.stability = p.stability ?? 2.5;
    card.difficulty = p.fsrsDifficulty ?? 3.5;

    const schedule = fsrs.repeat(card, p.lastReview);
    const updated = schedule[p.lastRating];
    const newDue = updated.card.due;

    console.log(
      `  FIX ${p.name}: ${p.nextReviewDate.toISOString()} → ${newDue.toISOString()}`
    );

    await prisma.problem.update({
      where: { id: p.id },
      data: { nextReviewDate: newDue },
    });

    fixed++;
  }

  console.log(`\nDone. Fixed ${fixed}/${buggy.length} problems.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
