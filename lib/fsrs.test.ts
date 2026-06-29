import { describe, it, expect } from "vitest";
import { scheduleReview, isValidRating } from "./fsrs";

describe("isValidRating", () => {
  it("accepts 1..4", () => {
    expect(isValidRating(1)).toBe(true);
    expect(isValidRating(4)).toBe(true);
  });
  it("rejects out-of-range and non-numbers", () => {
    expect(isValidRating(0)).toBe(false);
    expect(isValidRating(5)).toBe(false);
    expect(isValidRating("3")).toBe(false);
    expect(isValidRating(undefined)).toBe(false);
  });
});

describe("scheduleReview", () => {
  const now = new Date("2026-06-29T00:00:00Z");

  it("returns the fields needed to persist a review", () => {
    const update = scheduleReview({}, 3, 0.9, now);
    expect(update.lastRating).toBe(3);
    expect(update.lastReview).toEqual(now);
    expect(update.nextReviewDate.getTime()).toBeGreaterThan(now.getTime());
    expect(typeof update.stability).toBe("number");
    expect(typeof update.fsrsDifficulty).toBe("number");
    expect(typeof update.fsrsState).toBe("number");
  });

  it("schedules 'Again' sooner than 'Easy' for a fresh card", () => {
    const again = scheduleReview({}, 1, 0.9, now);
    const easy = scheduleReview({}, 4, 0.9, now);
    expect(again.nextReviewDate.getTime()).toBeLessThan(easy.nextReviewDate.getTime());
  });

  it("uses provided card state as the starting point", () => {
    const update = scheduleReview(
      { stability: 50, fsrsDifficulty: 5, fsrsState: 2, lastReview: now, nextReviewDate: now },
      3,
      0.9,
      now
    );
    expect(update.nextReviewDate.getTime()).toBeGreaterThan(now.getTime());
  });
});
