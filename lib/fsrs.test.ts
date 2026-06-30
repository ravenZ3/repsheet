import { describe, it, expect } from "vitest";
import { scheduleReview, isValidRating, computeRecall, isReviewDue } from "./fsrs";

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

describe("computeRecall", () => {
  const now = new Date("2026-06-29T00:00:00Z");
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  it("is 1 for a card never reviewed or missing stability", () => {
    expect(computeRecall({ stability: 10, lastReview: null }, now)).toBe(1);
    expect(computeRecall({ stability: null, lastReview: daysAgo(5) }, now)).toBe(1);
    expect(computeRecall({ stability: 0, lastReview: daysAgo(5) }, now)).toBe(1);
  });

  it("is 1 just after review and decays as time passes", () => {
    expect(computeRecall({ stability: 10, lastReview: now }, now)).toBe(1);
    const fresh = computeRecall({ stability: 10, lastReview: daysAgo(1) }, now);
    const stale = computeRecall({ stability: 10, lastReview: daysAgo(30) }, now);
    expect(fresh).toBeLessThan(1);
    expect(stale).toBeLessThan(fresh);
  });

  it("hits ~0.9 when elapsed days equal one FSRS half-step (S days)", () => {
    // R = (1 + t/(9S))^-1; at t = S, R = 9/10 = 0.9.
    expect(computeRecall({ stability: 10, lastReview: daysAgo(10) }, now)).toBeCloseTo(0.9, 5);
  });
});

describe("isReviewDue", () => {
  const now = new Date("2026-06-30T12:00:00Z");
  const hoursAway = (n: number) => new Date(now.getTime() + n * 60 * 60 * 1000);

  it("is due when the card has never been scheduled", () => {
    expect(isReviewDue({ nextReviewDate: null }, now)).toBe(true);
    expect(isReviewDue({}, now)).toBe(true);
  });

  it("is due when nextReviewDate has arrived or passed", () => {
    expect(isReviewDue({ nextReviewDate: now }, now)).toBe(true);
    expect(isReviewDue({ nextReviewDate: hoursAway(-1) }, now)).toBe(true);
  });

  it("is NOT due when nextReviewDate is still in the future", () => {
    // e.g. a problem just rated today, now scheduled for tomorrow, but still
    // surfaced by focused practice mode — re-rating it must be a no-op.
    expect(isReviewDue({ nextReviewDate: hoursAway(1) }, now)).toBe(false);
    expect(isReviewDue({ nextReviewDate: hoursAway(24) }, now)).toBe(false);
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
