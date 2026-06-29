import type { Difficulty } from "@prisma/client";

/**
 * Maps a Codeforces problem rating (Elo) to Repsheet's Difficulty enum.
 * Mirrors the mapping used by the Codeforces sync so the extension and sync
 * never disagree on the same problem.
 *
 * - rating <= 1200            -> Easy
 * - rating >= 1900            -> Hard
 * - otherwise (or no rating)  -> Medium
 */
export function codeforcesRatingToDifficulty(rating?: number | null): Difficulty {
  if (rating == null) return "Medium";
  if (rating <= 1200) return "Easy";
  if (rating >= 1900) return "Hard";
  return "Medium";
}

const VALID_DIFFICULTIES = new Set<string>(["Easy", "Medium", "Hard"]);

/**
 * Coerces an arbitrary string into a valid Difficulty, defaulting to Medium.
 * LeetCode already reports Easy/Medium/Hard directly; this normalizes casing
 * and guards against unexpected values from page scraping.
 */
export function normalizeDifficulty(value?: string | null): Difficulty {
  if (!value) return "Medium";
  const titled = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  return (VALID_DIFFICULTIES.has(titled) ? titled : "Medium") as Difficulty;
}
