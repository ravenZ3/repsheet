import { describe, it, expect } from "vitest"
import { extractLeetcodeSlug, normalizeName, buildProblemIndex } from "./match"
import type { MatchableProblem } from "./match"

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
