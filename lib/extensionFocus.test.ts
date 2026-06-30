import { describe, it, expect } from "vitest";
import { buildPatternFocusLists, byRecallAsc } from "./extensionFocus";
import type { CatalogProblemView, PatternBuckets } from "./patterns/match";

function solved(name: string, problemId: string): CatalogProblemView {
  return { name, slug: name, url: `https://lc/${name}`, difficulty: "Medium", status: "solved", due: true, struggling: false, problemId };
}
function unsolvedView(name: string, difficulty: string): CatalogProblemView {
  return { name, slug: name, url: `https://lc/${name}`, difficulty, status: "not-solved", due: false, struggling: false, problemId: null };
}

describe("buildPatternFocusLists", () => {
  const buckets: PatternBuckets = {
    due: [solved("Two Sum", "a"), solved("Three Sum", "b")],
    inProgress: [solved("Four Sum", "c")], // must be dropped
    notSolved: [unsolvedView("K Sum", "Hard"), unsolvedView("Easy One", "Easy")],
  };
  const recallFor = (id: string | null) => (id === "a" ? 0.9 : id === "b" ? 0.3 : 1);

  it("agenda is the due bucket only, sorted lowest-recall first", () => {
    const { agenda } = buildPatternFocusLists(buckets, recallFor);
    expect(agenda.map((r) => r.name)).toEqual(["Three Sum", "Two Sum"]);
    expect(agenda.map((r) => r.recall)).toEqual([0.3, 0.9]);
  });

  it("drops the inProgress bucket entirely", () => {
    const { agenda } = buildPatternFocusLists(buckets, recallFor);
    expect(agenda.find((r) => r.name === "Four Sum")).toBeUndefined();
  });

  it("unsolved is notSolved as compact rows in catalog order", () => {
    const { unsolved } = buildPatternFocusLists(buckets, recallFor);
    expect(unsolved).toEqual([
      { name: "K Sum", url: "https://lc/K Sum", difficulty: "Hard" },
      { name: "Easy One", url: "https://lc/Easy One", difficulty: "Easy" },
    ]);
  });

  it("yields empty lists for empty buckets", () => {
    const { agenda, unsolved } = buildPatternFocusLists({ due: [], inProgress: [], notSolved: [] }, recallFor);
    expect(agenda).toEqual([]);
    expect(unsolved).toEqual([]);
  });
});

describe("byRecallAsc", () => {
  it("orders lower recall first", () => {
    expect(byRecallAsc({ name: "x", url: null, recall: 0.2 }, { name: "y", url: null, recall: 0.8 })).toBeLessThan(0);
  });
});
