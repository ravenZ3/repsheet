import { describe, it, expect } from "vitest";
import { codeforcesRatingToDifficulty, normalizeDifficulty } from "./difficulty";

describe("codeforcesRatingToDifficulty", () => {
  it("maps low ratings to Easy", () => {
    expect(codeforcesRatingToDifficulty(800)).toBe("Easy");
    expect(codeforcesRatingToDifficulty(1200)).toBe("Easy");
  });

  it("maps high ratings to Hard", () => {
    expect(codeforcesRatingToDifficulty(1900)).toBe("Hard");
    expect(codeforcesRatingToDifficulty(3000)).toBe("Hard");
  });

  it("maps mid ratings to Medium", () => {
    expect(codeforcesRatingToDifficulty(1201)).toBe("Medium");
    expect(codeforcesRatingToDifficulty(1899)).toBe("Medium");
  });

  it("defaults to Medium when rating is missing", () => {
    expect(codeforcesRatingToDifficulty(null)).toBe("Medium");
    expect(codeforcesRatingToDifficulty(undefined)).toBe("Medium");
  });
});

describe("normalizeDifficulty", () => {
  it("normalizes casing of valid values", () => {
    expect(normalizeDifficulty("easy")).toBe("Easy");
    expect(normalizeDifficulty("MEDIUM")).toBe("Medium");
    expect(normalizeDifficulty("Hard")).toBe("Hard");
  });

  it("defaults unknown or empty values to Medium", () => {
    expect(normalizeDifficulty("")).toBe("Medium");
    expect(normalizeDifficulty(null)).toBe("Medium");
    expect(normalizeDifficulty("impossible")).toBe("Medium");
  });
});
