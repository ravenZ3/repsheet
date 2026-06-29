import { FSRS, Card, Rating } from "fsrs.js";

export const MAX_INTERVAL = 365;
export const DEFAULT_RETENTION = 0.9;
export const DEFAULT_STABILITY = 2.5;
export const DEFAULT_DIFFICULTY = 3.5;

/** The FSRS-relevant state of a problem. */
export interface FsrsCardState {
  stability?: number | null;
  fsrsDifficulty?: number | null;
  fsrsState?: number | null;
  nextReviewDate?: Date | null;
  lastReview?: Date | null;
}

/** The fields to persist back onto a Problem after a review. */
export interface FsrsUpdate {
  stability: number;
  fsrsDifficulty: number;
  fsrsState: number;
  lastRating: number;
  lastReview: Date;
  nextReviewDate: Date;
}

/**
 * Runs the FSRS scheduler for a single review and returns the fields to persist.
 * Shared by the web review flow (`app/review/mark`) and the extension capture
 * endpoint so scheduling logic lives in exactly one place.
 */
export function scheduleReview(
  problem: FsrsCardState,
  rating: number,
  retention: number = DEFAULT_RETENTION,
  now: Date = new Date()
): FsrsUpdate {
  const fsrs = new FSRS();
  fsrs.p.maximum_interval = MAX_INTERVAL;
  fsrs.p.request_retention = retention ?? DEFAULT_RETENTION;

  const card = new Card();
  card.state = problem.fsrsState ?? 0;
  card.due = problem.nextReviewDate ?? now;
  card.last_review = problem.lastReview ?? now;
  card.stability = problem.stability ?? DEFAULT_STABILITY;
  card.difficulty = problem.fsrsDifficulty ?? DEFAULT_DIFFICULTY;

  const schedule = fsrs.repeat(card, now);
  const outcome = schedule[rating as Rating];

  return {
    stability: outcome.card.stability,
    fsrsDifficulty: outcome.card.difficulty,
    fsrsState: outcome.card.state,
    lastRating: rating,
    lastReview: now,
    nextReviewDate: outcome.card.due,
  };
}

/**
 * Current recall probability (FSRS retrievability) for a card, derived from its
 * stored stability and time since last review. Matches fsrs.js's own forgetting
 * curve: R = (1 + t/(9S))^-1, with t in days. A card that has never been
 * reviewed (or has no stability) is treated as fully fresh (1).
 */
export function computeRecall(
  problem: Pick<FsrsCardState, "stability" | "lastReview">,
  now: Date = new Date()
): number {
  if (!problem.lastReview || !problem.stability || problem.stability <= 0) return 1;
  const elapsedDays = (now.getTime() - problem.lastReview.getTime()) / (24 * 60 * 60 * 1000);
  if (elapsedDays <= 0) return 1;
  return Math.pow(1 + elapsedDays / (9 * problem.stability), -1);
}

/** Valid FSRS ratings: 1=Again, 2=Hard, 3=Good, 4=Easy. */
export function isValidRating(rating: unknown): rating is number {
  return typeof rating === "number" && rating >= 1 && rating <= 4;
}
