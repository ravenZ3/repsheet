import { describe, it, expect } from "vitest";
import {
  parseFocusTag,
  formatFocusTag,
  isValidFocusTag,
  parseFocusTags,
} from "./focusTags";

describe("parseFocusTag", () => {
  it("parses a pattern tag", () => {
    expect(parseFocusTag("pattern:two-pointers")).toEqual({
      kind: "pattern",
      value: "two-pointers",
    });
  });

  it("parses a skill tag", () => {
    expect(parseFocusTag("skill:dp")).toEqual({ kind: "skill", value: "dp" });
  });

  it("keeps colons inside the value", () => {
    expect(parseFocusTag("skill:graph:bfs")).toEqual({
      kind: "skill",
      value: "graph:bfs",
    });
  });

  it("rejects unknown kinds", () => {
    expect(parseFocusTag("topic:dp")).toBeNull();
  });

  it("rejects empty value or malformed input", () => {
    expect(parseFocusTag("pattern:")).toBeNull();
    expect(parseFocusTag("skill")).toBeNull();
    expect(parseFocusTag("")).toBeNull();
  });
});

describe("formatFocusTag", () => {
  it("round-trips with parseFocusTag", () => {
    const s = "pattern:hash-map-hash-set";
    expect(formatFocusTag(parseFocusTag(s)!)).toBe(s);
  });
});

describe("isValidFocusTag", () => {
  it("matches parseability", () => {
    expect(isValidFocusTag("skill:greedy")).toBe(true);
    expect(isValidFocusTag("bogus")).toBe(false);
  });
});

describe("parseFocusTags", () => {
  it("filters out invalid entries", () => {
    expect(parseFocusTags(["skill:dp", "bad", "pattern:x"])).toEqual([
      { kind: "skill", value: "dp" },
      { kind: "pattern", value: "x" },
    ]);
  });

  it("dedupes identical entries", () => {
    expect(parseFocusTags(["skill:dp", "skill:dp"])).toEqual([
      { kind: "skill", value: "dp" },
    ]);
  });
});
