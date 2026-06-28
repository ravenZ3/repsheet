# Mobile Responsiveness Pass — Design

**Date:** 2026-06-28
**Status:** Approved (design); pending implementation plan

## Summary

RepSheet's two heaviest screens render poorly on phones, which matters before any
public (Reddit) launch where most traffic is mobile. Two problems:

1. **Dashboard** is not phone-optimized. The three progress stat cards
   (Due today / Reviewed today / Backlog) use `grid-cols-1 md:grid-cols-3`, so on
   phones they stack full-width with an 80px number each — enormous and pushing
   real content below the fold. Other hover-only affordances (the contest
   "Join →" link) are unusable on touch.
2. **Problems page** shows the selected problem's detail *below* the list on
   mobile (the responsive grid's second cell), so tapping a problem appears to do
   nothing until the user scrolls. The expected pattern is a full-screen overlay
   on top with a close (X) button.

This is a presentational pass: responsive Tailwind classes only, no data/logic
changes, no schema changes. Desktop layouts stay exactly as they are.

## Goals

- Three progress stat cards fit in a single row on phones, legibly scaled.
- The Problems detail appears as a full-screen overlay on mobile with the
  existing X to close; desktop keeps its side-by-side panel.
- Touch-only users can use affordances that are currently hover-only.
- No horizontal overflow on common phone widths (~360–414px).

## Non-Goals (deferred)

- Making the Problems **filters** panel a mobile overlay (same technique later if
  wanted).
- Reworking charts beyond preventing overflow (recharts `ResponsiveContainer`
  already scales width).
- Any backend, data, or schema change.
- Automated visual/responsive tests (the repo has no such infra; verification is
  build + manual).

## Design

### A. Problems detail → mobile overlay (`app/problems/ProblemsClient.tsx`)

The selected `ProblemDetail` currently sits in the second cell of the responsive
grid (`grid-cols-1 lg:grid-cols-[400px_1fr]`), so on mobile it renders below the
list. Wrap the rendered `<ProblemDetail>` in a container that is a full-screen
overlay on mobile and the in-grid panel on desktop — **responsive Tailwind
classes only, no JS breakpoint**:

```
fixed inset-0 z-50 overflow-y-auto bg-gray-50 dark:bg-black p-3
lg:relative lg:inset-auto lg:z-auto lg:overflow-visible lg:bg-transparent lg:p-0
```

- The existing **X** button (`onClose`) already clears the `selected` param and
  closes the panel — no new close affordance needed.
- Desktop (`lg+`) is visually unchanged.
- The grid's column-template logic that widens to `[400px_1fr]` when a problem is
  selected still applies at `lg+`; on mobile the list stays single-column
  underneath the overlay.

### B. Dashboard phone pass (`components/DashboardCharts.tsx`)

1. **Progress stat cards** (around line 390):
   - Container: `grid-cols-1 md:grid-cols-3` → **`grid-cols-3`** (always three
     across).
   - Number: `text-[80px]` → responsive, e.g.
     `text-[34px] sm:text-[56px] md:text-[80px]`.
   - Tighten card padding and keep the label readable at the small size (e.g.
     reduce `px-4 py-2` to `px-3 py-1.5 sm:px-4 sm:py-2`; keep `min-h-[90px]` or
     lower it on mobile). Goal: three compact, legible cards in one row at ~360px.

2. **Contest "Join →" link** (around line 102): currently
   `opacity-0 group-hover:opacity-100` (hover-only). Change to
   `opacity-100 sm:opacity-0 sm:group-hover:opacity-100` so it's visible/tappable
   on touch and retains the hover reveal on desktop.

3. **Audit pass:**
   - Platform toggle (`All Platforms / LeetCode / Codeforces`, around line 362):
     allow wrapping or shrink padding on the narrowest screens so it never
     overflows.
   - Confirm the heatmap grid, charts, and Recent Activity don't cause horizontal
     scroll on phone; tighten paddings where needed.
   - Fix any other hover-only affordance found in Recent Activity the same way as
     the contest link (visible on mobile, hover-reveal on desktop).

## Testing

No automated visual tests exist in the repo. Verification is:
- `npm run build` succeeds (no type/lint regressions).
- Manual responsive check at ~360px, ~390px, and a desktop width (Chrome DevTools
  device toolbar and/or a real phone):
  - Dashboard: three stat cards in one row, legible; contest Join button visible;
    no horizontal overflow anywhere.
  - Problems: tapping a problem opens a full-screen overlay with a working X;
    desktop still shows the side-by-side panel.

## Files

- Modify: `app/problems/ProblemsClient.tsx` (detail overlay wrapper)
- Modify: `components/DashboardCharts.tsx` (stat cards, contest link, audit fixes)
