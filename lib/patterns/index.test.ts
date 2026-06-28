import { describe, it, expect } from "vitest"
import { getCatalog } from "./index"

describe("getCatalog", () => {
  it("loads the automedon catalog with 41 patterns and 820 problems", () => {
    const c = getCatalog()
    expect(c.source).toBe("automedon")
    expect(c.patterns).toHaveLength(41)
    const total = c.patterns.reduce((n, p) => n + p.problems.length, 0)
    expect(total).toBe(820)
  })

  it("every problem has name, slug, url and valid difficulty", () => {
    const c = getCatalog()
    for (const pat of c.patterns) {
      expect(pat.id).toBeTruthy()
      for (const pr of pat.problems) {
        expect(pr.name).toBeTruthy()
        expect(pr.slug).toBeTruthy()
        expect(pr.url).toContain("leetcode.com/problems/")
        expect(["Easy", "Medium", "Hard"]).toContain(pr.difficulty)
      }
    }
  })

  it("throws on unknown source", () => {
    expect(() => getCatalog("nope")).toThrow()
  })
})
