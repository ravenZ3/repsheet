import type { PatternBuckets } from "@/lib/patterns/match";

/** A row for the popup's agenda list: name, where it links, recall %. */
export interface ProblemRow {
  name: string;
  url: string | null;
  recall: number;
}

/** A compact row for the "not yet solved" pick-next list. */
export interface UnsolvedRow {
  name: string;
  url: string | null;
  difficulty: string;
}

/** Most-urgent first: lowest recall (closest to forgotten) at the top. */
export function byRecallAsc(a: ProblemRow, b: ProblemRow): number {
  return a.recall - b.recall;
}

/**
 * Maps a pattern's buckets into the two popup lists: the agenda (solved AND due,
 * most-urgent first) and the unsolved suggestions (catalog order). The
 * solved-but-not-due "inProgress" bucket is intentionally dropped from the popup.
 */
export function buildPatternFocusLists(
  buckets: PatternBuckets,
  recallFor: (problemId: string | null) => number
): { agenda: ProblemRow[]; unsolved: UnsolvedRow[] } {
  const agenda: ProblemRow[] = buckets.due
    .map((p) => ({ name: p.name, url: p.url, recall: recallFor(p.problemId) }))
    .sort(byRecallAsc);
  const unsolved: UnsolvedRow[] = buckets.notSolved.map((p) => ({
    name: p.name,
    url: p.url,
    difficulty: p.difficulty,
  }));
  return { agenda, unsolved };
}
