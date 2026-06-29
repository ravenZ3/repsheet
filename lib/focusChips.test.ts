import { describe, it, expect } from "vitest";
import { resolveFocusChips } from "./focusChips";

describe("resolveFocusChips", () => {
  it("builds a topic href for skills", () => {
    const chips = resolveFocusChips(["skill:dp"]);
    expect(chips).toEqual([
      { label: "dp", kind: "skill", href: "/review?topic=dp" },
    ]);
  });

  it("builds a pattern href and resolves the catalog name", () => {
    // hash-map-hash-set exists in the automedon catalog as "Hash Map / Hash Set"
    const chips = resolveFocusChips(["pattern:hash-map-hash-set"]);
    expect(chips[0].kind).toBe("pattern");
    expect(chips[0].href).toBe("/review?pattern=hash-map-hash-set");
    expect(chips[0].label).toBe("Hash Map / Hash Set");
  });

  it("drops malformed tags", () => {
    expect(resolveFocusChips(["garbage", "skill:greedy"])).toEqual([
      { label: "greedy", kind: "skill", href: "/review?topic=greedy" },
    ]);
  });

  it("encodes special characters in hrefs", () => {
    const chips = resolveFocusChips(["skill:two pointers"]);
    expect(chips[0].href).toBe("/review?topic=two%20pointers");
  });
});
