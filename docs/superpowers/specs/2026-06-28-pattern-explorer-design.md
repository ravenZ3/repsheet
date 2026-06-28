# Pattern Explorer — Design

**Date:** 2026-06-28
**Status:** Approved (design); pending implementation plan

## Summary

Add an **opt-in Pattern Explorer** to RepSheet. DSA mastery is about recognizing
*techniques* (Sliding Window, Two Pointers, Monotonic Stack, …), not just
*topics* (Array, DP, Graph). RepSheet already groups problems by topic via the
free-form `Problem.category` field. The Pattern Explorer adds a separate,
curated **pattern → problems** catalog and overlays the user's own solved
problems onto it to show, per pattern, both **coverage** ("have I done this?")
and **review health** ("is it rusty?"). The review-health angle is unique to
RepSheet because no external patterns site tracks the user's retention.

The feature is **off by default**, gated behind a toggle in Settings. When
enabled, a **Patterns** page appears in the navbar.

## Goals

- Browse a curated pattern catalog as a study roadmap, including problems the
  user has not solved yet.
- Light up the user's solved problems against the catalog: per-pattern coverage
  plus FSRS-derived review status (Due, Struggling).
- Keep the core Dictionary experience unchanged for users who don't opt in.
- Architect the catalog layer so a second source (seanprashad) can be added
  later without a rewrite.

## Non-Goals (deferred follow-ups)

- Deep-linking an unsolved catalog problem into a prefilled `/add` flow.
- Pattern-level "start a review session."
- The seanprashad source (its value-add is company tags, not patterns). The
  architecture supports it; it is not built in this iteration.
- Multiple user-selectable catalog sources / a source dropdown.

## Catalog Source

**Automedon/ultimate-leetcode-patterns** — 41 patterns, 820 problems (20 each),
all free (no LeetCode Premium). Source of truth is a single Markdown file
(`Readme.md` on the `main` branch).

**Why automedon over seanprashad:** the spec's whole thesis is *techniques* over
*topics*. Inspection of seanprashad's `questions.json` showed its `pattern` field
is LeetCode's multi-tag set that mixes topics (Array, String, Hash Table, Tree —
96/39/37/25 problems) with techniques, and each problem carries several tags. The
topic tags duplicate RepSheet's existing `Problem.category` feature and bury the
techniques. Automedon's 41 entries are *pure technique names* (Sliding Window,
Two Pointers, Monotonic Stack, Prefix Sum, Topological Sort, Cyclic Sort, Two
Heaps, K-way Merge, …), exactly one technique per section — a far better fit.

The only cost is parsing markdown instead of JSON, and the format is rigidly
regular (verified: a parser extracts all 41 patterns × 20 problems cleanly,
including digit-bearing slugs like `4sum-ii`).

Other sources surveyed for the record: seanprashad/leetcode-patterns (179
problems, structured JSON, company tags — the planned second source), NeetCode
150 (18 groups), Grokking "14 Patterns" (prose),
MoiseevIgorPython/Leetcode-Patterns (markdown table).

## Architecture

**Static catalog + live overlay.** The pattern list is a build-time JSON
committed to the repo — no DB rows for the catalog, no runtime fetch, no sync
job. At page load the app overlays the user's `Problem` records onto the catalog
in memory to compute coverage and review health. The only schema change is one
boolean to gate the feature.

### 1. Catalog data pipeline

- `scripts/build-pattern-catalog.ts` — fetches automedon's Markdown
  (`https://raw.githubusercontent.com/Automedon/ultimate-leetcode-patterns/main/Readme.md`),
  parses it, and emits normalized JSON to `lib/patterns/catalogs/automedon.json`.
  Parse rules (verified against the live file):
  - Pattern heading: `^##\s+(\d+)\.\s+(.+?)\s*$` → ordinal + name.
  - Problem line: `^\d+\.\s+\[(.+?)\]\((https://leetcode\.com/problems/([^/)]+)/?)\)\s+\((Easy|Medium|Hard)\)\s*$`
    → name + url + slug + difficulty.
  - The `## Patterns` table-of-contents heading has no ordinal in this regex's
    capture form and its entries are links (`[1. ...](#...)`), so they are
    naturally skipped.
  - Pattern `id` = slugified name (lowercase, non-alphanumeric runs → `-`).

  ```jsonc
  {
    "source": "automedon",
    "generatedAt": "2026-06-28T00:00:00.000Z",
    "patterns": [
      {
        "id": "sliding-window",
        "name": "Sliding Window",
        "problems": [
          {
            "name": "Longest Substring Without Repeating Characters",
            "slug": "longest-substring-without-repeating-characters",
            "url": "https://leetcode.com/problems/longest-substring-without-repeating-characters/",
            "difficulty": "Medium"
          }
        ]
      }
    ]
  }
  ```

- `lib/patterns/types.ts` — defines the `CatalogSource`, `CatalogPattern`, and
  `CatalogProblem` types.
- `lib/patterns/index.ts` — a small registry exposing the available catalog(s).
  **This is the extension point for seanprashad:** add `seanprashad.json` +
  register it; everything downstream is source-agnostic.
- The catalog is regenerated only when the script is re-run. Committed JSON =
  reproducible builds, zero runtime fetch.

### 2. Matching & status — pure functions in `lib/patterns/match.ts`

- Extract the LeetCode slug from each `Problem.link` via
  `leetcode\.com/problems/([^/]+)`; build a `slug → Problem` map (LeetCode
  problems only). Fallback: normalized-name match (lowercase, strip
  punctuation/whitespace) when a problem has no link.
- Per catalog problem, derive a status:
  - **Not solved** — no matching user problem.
  - **Solved** — matched.
  - **Due** — matched and `nextReviewDate != null && nextReviewDate <= now`.
  - **Struggling** — matched and `lastRating === 1` (rated "Again") on the last
    review.
  (Due and Struggling are sub-states of Solved; a problem can be both.)
- Per pattern, aggregate `{ total, solved, due, struggling }`.

All status fields come from data already on `Problem`
(`nextReviewDate`, `lastRating`, `fsrsState`, `stability`) — no new modeling.

### 3. UI

- `app/patterns/page.tsx` (server component): if the user's `showPatterns` flag
  is off → redirect to `/dashboard`. Otherwise load the user's problems, compute
  the overlay server-side, and pass a plain view-model to the client.
- `app/patterns/PatternsClient.tsx`: one accordion per pattern (reuses
  `components/ui/accordion`). Header = pattern name + a coverage bar +
  `7 / 20 · 2 due`. Expanded = problem rows, each with a difficulty badge and a
  status dot.
  - **Solved** row → opens the existing `ProblemDetail` via a Dictionary
    deep-link (`/problems?selected=<id>`).
  - **Not-solved** row → external link to the LeetCode problem.
- `components/Navbar.tsx`: conditionally render a **Patterns** link when the
  flag is on.

### 4. The toggle

- Prisma: add `showPatterns Boolean @default(false)` to `User`.
- Extend `app/api/settings/route.ts` to read/write the flag.
- Add a switch row to `SettingsDialog`. There is no `ui/switch` component yet —
  add one, or reuse the existing toggle-button style for visual consistency.

## Data Flow

```
seanprashad data ──(build script, one-off)──▶ catalogs/seanprashad.json (committed)
                                                          │
user's Problem[] ──┐                                      │
                   ▼                                       ▼
        lib/patterns/match.ts  ◀── reads catalog ── lib/patterns/index.ts
                   │
                   ▼
        per-pattern view-model {total, solved, due, struggling, problems[...]}
                   │
                   ▼
        app/patterns/page.tsx (server) ──▶ PatternsClient.tsx
```

## Error Handling

- Gating: `showPatterns` off → server-side redirect to `/dashboard`; the navbar
  link is also hidden, so the page is unreachable through the UI.
- Missing/empty catalog JSON → page renders an empty state rather than throwing.
- Problems with no parseable LeetCode slug and no name match simply count as
  "not solved" against the catalog (they still live in the Dictionary).
- Non-LeetCode problems (e.g. Codeforces) never match the LeetCode catalog —
  expected, not an error.

## Testing

TDD the pure functions in `lib/patterns/match.ts` with sample `Problem`
fixtures:

- Slug extraction from a variety of `link` formats (trailing slash, query
  string, `/description`, missing link).
- Normalized-name fallback matching.
- Status derivation: not-solved / solved / due / struggling, including the
  both-due-and-struggling case.
- Per-pattern aggregation counts.

Plus a catalog-shape test asserting the normalized JSON validates against the
`CatalogSource` type.

## Schema Change

```prisma
model User {
  // ...existing fields...
  showPatterns Boolean @default(false)
}
```
