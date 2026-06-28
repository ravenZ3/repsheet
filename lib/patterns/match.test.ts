import { describe, it, expect } from "vitest"
import { extractLeetcodeSlug, normalizeName, buildProblemIndex, buildPatternView } from "./match"
import type { MatchableProblem } from "./match"
import type { Catalog } from "./types"

describe("extractLeetcodeSlug", () => {
  it("extracts slug with trailing slash", () => {
    expect(extractLeetcodeSlug("https://leetcode.com/problems/two-sum/")).toBe("two-sum")
  })
  it("extracts slug without trailing slash", () => {
    expect(extractLeetcodeSlug("https://leetcode.com/problems/two-sum")).toBe("two-sum")
  })
  it("extracts slug with /description suffix", () => {
    expect(extractLeetcodeSlug("https://leetcode.com/problems/4sum-ii/description/")).toBe("4sum-ii")
  })
  it("ignores query strings", () => {
    expect(extractLeetcodeSlug("https://leetcode.com/problems/two-sum/?envType=list")).toBe("two-sum")
  })
  it("returns null for non-leetcode links", () => {
    expect(extractLeetcodeSlug("https://codeforces.com/problemset/problem/1/A")).toBeNull()
  })
  it("returns null for null/empty", () => {
    expect(extractLeetcodeSlug(null)).toBeNull()
    expect(extractLeetcodeSlug("")).toBeNull()
  })
})

describe("normalizeName", () => {
  it("lowercases and strips punctuation/whitespace", () => {
    expect(normalizeName("Insert Delete GetRandom O(1)")).toBe("insertdeletegetrandomo1")
  })
  it("matches across spacing differences", () => {
    expect(normalizeName("Two  Sum")).toBe(normalizeName("two sum"))
  })
})

describe("buildProblemIndex", () => {
  const problems: MatchableProblem[] = [
    { id: "a", name: "Two Sum", link: "https://leetcode.com/problems/two-sum/", platform: "leetcode", nextReviewDate: null, lastRating: null },
    { id: "b", name: "Group Anagrams", link: null, platform: "leetcode", nextReviewDate: null, lastRating: null },
    { id: "c", name: "Watermelon", link: "https://codeforces.com/x", platform: "codeforces", nextReviewDate: null, lastRating: null },
  ]
  it("indexes leetcode problems by slug", () => {
    const idx = buildProblemIndex(problems)
    expect(idx.bySlug.get("two-sum")?.id).toBe("a")
  })
  it("indexes all problems by normalized name", () => {
    const idx = buildProblemIndex(problems)
    expect(idx.byName.get(normalizeName("Group Anagrams"))?.id).toBe("b")
  })
  it("does not index non-leetcode links by slug", () => {
    const idx = buildProblemIndex(problems)
    expect(idx.bySlug.has("x")).toBe(false)
  })
})

const NOW = new Date("2026-06-28T12:00:00.000Z")
const PAST = new Date("2026-06-20T00:00:00.000Z")
const FUTURE = new Date("2026-07-10T00:00:00.000Z")

const catalog: Catalog = {
  source: "test",
  generatedAt: NOW.toISOString(),
  patterns: [
    {
      id: "sliding-window",
      name: "Sliding Window",
      problems: [
        { name: "Two Sum", slug: "two-sum", url: "https://leetcode.com/problems/two-sum/", difficulty: "Easy" },
        { name: "Group Anagrams", slug: "group-anagrams", url: "https://leetcode.com/problems/group-anagrams/", difficulty: "Medium" },
        { name: "First Missing Positive", slug: "first-missing-positive", url: "https://leetcode.com/problems/first-missing-positive/", difficulty: "Hard" },
      ],
    },
  ],
}

describe("buildPatternView", () => {
  it("marks a slug-matched problem solved, due when nextReviewDate is past", () => {
    const view = buildPatternView(catalog, [
      { id: "p1", name: "Two Sum", link: "https://leetcode.com/problems/two-sum/", platform: "leetcode", nextReviewDate: PAST, lastRating: 3 },
    ], NOW)
    const p = view[0].problems.find((x) => x.slug === "two-sum")!
    expect(p.status).toBe("solved")
    expect(p.due).toBe(true)
    expect(p.problemId).toBe("p1")
  })

  it("does not mark due when nextReviewDate is in the future", () => {
    const view = buildPatternView(catalog, [
      { id: "p1", name: "Two Sum", link: "https://leetcode.com/problems/two-sum/", platform: "leetcode", nextReviewDate: FUTURE, lastRating: 3 },
    ], NOW)
    expect(view[0].problems.find((x) => x.slug === "two-sum")!.due).toBe(false)
  })

  it("marks struggling when lastRating is 1", () => {
    const view = buildPatternView(catalog, [
      { id: "p1", name: "Two Sum", link: "https://leetcode.com/problems/two-sum/", platform: "leetcode", nextReviewDate: PAST, lastRating: 1 },
    ], NOW)
    const p = view[0].problems.find((x) => x.slug === "two-sum")!
    expect(p.struggling).toBe(true)
    expect(p.due).toBe(true)
  })

  it("falls back to normalized-name match when link is missing", () => {
    const view = buildPatternView(catalog, [
      { id: "p2", name: "Group Anagrams", link: null, platform: "leetcode", nextReviewDate: null, lastRating: null },
    ], NOW)
    expect(view[0].problems.find((x) => x.slug === "group-anagrams")!.status).toBe("solved")
  })

  it("marks unmatched catalog problems not-solved", () => {
    const view = buildPatternView(catalog, [], NOW)
    const p = view[0].problems.find((x) => x.slug === "first-missing-positive")!
    expect(p.status).toBe("not-solved")
    expect(p.problemId).toBeNull()
  })

  it("aggregates per-pattern counts", () => {
    const view = buildPatternView(catalog, [
      { id: "p1", name: "Two Sum", link: "https://leetcode.com/problems/two-sum/", platform: "leetcode", nextReviewDate: PAST, lastRating: 1 },
    ], NOW)
    expect(view[0]).toMatchObject({ total: 3, solved: 1, due: 1, struggling: 1 })
  })
})
