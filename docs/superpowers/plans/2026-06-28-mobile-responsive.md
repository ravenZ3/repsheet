# Mobile Responsiveness Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Dashboard and Problems pages usable on phones — three stat cards in one row, a mobile overlay for the problem detail, and tappable (not hover-only) controls.

**Architecture:** Presentational-only changes using responsive Tailwind classes. No JS breakpoints, no data/logic/schema changes. Desktop layouts are preserved by gating every change behind `sm:`/`lg:` breakpoints.

**Tech Stack:** Next.js 16 (App Router, React 19), Tailwind CSS v4, recharts.

## Global Constraints

- Tailwind responsive classes only; no JS breakpoint detection, no logic/data/schema changes.
- Desktop (`lg+`, and `sm+` where noted) layouts must be visually unchanged.
- No automated visual tests exist; verification is `npm run build` + manual responsive check at ~360px and ~390px plus a desktop width.
- Do **not** add Co-Authored-By trailers to commits. Work on branch `feat/mobile-responsive`.
- Target phone widths without horizontal overflow: ~360–414px.

---

## File Structure

- `app/problems/ProblemsClient.tsx` — wrap the rendered `<ProblemDetail>` so it is a full-screen overlay on mobile and the in-grid side panel on desktop.
- `components/DashboardCharts.tsx` — stat cards to one row with responsive number sizing; un-hide the contest "Join" link on touch; audit-pass fixes (platform toggle wrap, any other hover-only affordance).

Each task ends at a clean `npm run build` and is independently reviewable.

---

### Task 1: Problems detail → mobile overlay

**Files:**
- Modify: `app/problems/ProblemsClient.tsx` (the `selectedProblem` render branch)

**Interfaces:**
- No exported interface change; `ProblemDetail` props and `onClose` behavior are untouched.

- [ ] **Step 1: Locate the detail render branch**

In `app/problems/ProblemsClient.tsx`, find the `selectedProblem` branch (it currently looks like this):

```tsx
                    ) : selectedProblem ? (
                        <div className="lg:h-full lg:min-h-0">
                            <ProblemDetail
                                problem={selectedProblem}
                                onUpdate={handleProblemUpdate}
                                onClose={handleClose}
                            />
                        </div>
                    ) : (
```

- [ ] **Step 2: Wrap it as a responsive overlay**

Replace the wrapping `<div className="lg:h-full lg:min-h-0">` with one that is a full-screen overlay on mobile and the normal in-grid panel at `lg+`:

```tsx
                    ) : selectedProblem ? (
                        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-50 dark:bg-black p-3 lg:relative lg:inset-auto lg:z-auto lg:overflow-visible lg:bg-transparent lg:p-0 lg:h-full lg:min-h-0">
                            <ProblemDetail
                                problem={selectedProblem}
                                onUpdate={handleProblemUpdate}
                                onClose={handleClose}
                            />
                        </div>
                    ) : (
```

Rationale: on mobile the detail covers the viewport (the existing X in `ProblemDetail` calls `handleClose`, clearing the `selected` param). At `lg+` the `lg:` overrides restore the exact previous in-grid behavior.

- [ ] **Step 3: Verify build compiles**

Run: `npm run build`
Expected: build succeeds; `/problems` still listed.

- [ ] **Step 4: Manual check**

Run `npm run dev`. In Chrome DevTools device toolbar at ~390px on `/problems`: tap a problem → detail covers the screen → the X closes it back to the list. Resize to desktop width → detail shows as the right-hand side panel exactly as before.

- [ ] **Step 5: Commit**

```bash
git add app/problems/ProblemsClient.tsx
git commit -m "feat: show problem detail as full-screen overlay on mobile"
```

---

### Task 2: Dashboard stat cards → one row

**Files:**
- Modify: `components/DashboardCharts.tsx` (the three progress cards, ~line 390)

**Interfaces:**
- No interface change.

- [ ] **Step 1: Change the grid to three-across on all widths**

In `components/DashboardCharts.tsx`, find:

```tsx
				<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
```

Replace with:

```tsx
				<div className="grid grid-cols-3 gap-2 sm:gap-3">
```

- [ ] **Step 2: Make the three card numbers responsive (Due today)**

Find the "Due today" card's number:

```tsx
					<p className="text-[80px] leading-none [font-family:var(--font-merriweather)] text-gray-900 dark:text-gray-100 px-4 py-2 flex-1">{progress.dueToday}</p>
```

Replace with:

```tsx
					<p className="text-[34px] sm:text-[56px] md:text-[80px] leading-none [font-family:var(--font-merriweather)] text-gray-900 dark:text-gray-100 px-3 py-1.5 sm:px-4 sm:py-2 flex-1">{progress.dueToday}</p>
```

- [ ] **Step 3: Make the "Reviewed today" number responsive**

Find:

```tsx
					<p className="text-[80px] leading-none [font-family:var(--font-merriweather)] text-green-600 dark:text-green-400 px-4 py-2 flex-1">{progress.reviewedToday}</p>
```

Replace with:

```tsx
					<p className="text-[34px] sm:text-[56px] md:text-[80px] leading-none [font-family:var(--font-merriweather)] text-green-600 dark:text-green-400 px-3 py-1.5 sm:px-4 sm:py-2 flex-1">{progress.reviewedToday}</p>
```

- [ ] **Step 4: Make the "Backlog" number responsive**

Find:

```tsx
					<p className={`text-[80px] leading-none [font-family:var(--font-merriweather)] px-4 py-2 flex-1 ${progress.backlog > 0 ? "text-orange-500" : "text-gray-900 dark:text-gray-100"}`}>+{progress.backlog}</p>
```

Replace with:

```tsx
					<p className={`text-[34px] sm:text-[56px] md:text-[80px] leading-none [font-family:var(--font-merriweather)] px-3 py-1.5 sm:px-4 sm:py-2 flex-1 ${progress.backlog > 0 ? "text-orange-500" : "text-gray-900 dark:text-gray-100"}`}>+{progress.backlog}</p>
```

- [ ] **Step 5: Shrink the card labels on mobile so they fit under the smaller number**

Each card has a label like:

```tsx
					<p className="text-[11px] font-medium text-gray-400 dark:text-[#555] absolute bottom-2.5 right-3">Due today</p>
```

For all three labels, change `text-[11px] ... bottom-2.5 right-3` to `text-[9px] sm:text-[11px] ... bottom-2 right-2 sm:bottom-2.5 sm:right-3`. The three full replacements:

```tsx
					<p className="text-[9px] sm:text-[11px] font-medium text-gray-400 dark:text-[#555] absolute bottom-2 right-2 sm:bottom-2.5 sm:right-3">Due today</p>
```

```tsx
					<p className="text-[9px] sm:text-[11px] font-medium text-gray-400 dark:text-[#555] absolute bottom-2 right-2 sm:bottom-2.5 sm:right-3">Reviewed today</p>
```

```tsx
					<p className="text-[9px] sm:text-[11px] font-medium text-gray-400 dark:text-[#555] absolute bottom-2 right-2 sm:bottom-2.5 sm:right-3">{progress.backlog > 0 ? `~${progress.daysToClear}d to clear` : "Backlog"}</p>
```

- [ ] **Step 6: Verify build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 7: Manual check**

Run `npm run dev`. At ~360px on `/dashboard`: the three cards sit in one row, numbers legible and not clipped, labels readable. At desktop width: identical to before (80px numbers).

- [ ] **Step 8: Commit**

```bash
git add components/DashboardCharts.tsx
git commit -m "feat: fit dashboard progress cards in one row on mobile"
```

---

### Task 3: Touch affordances + overflow audit

**Files:**
- Modify: `components/DashboardCharts.tsx` (contest "Join" link; platform toggle)

**Interfaces:**
- No interface change.

- [ ] **Step 1: Make the contest "Join" link visible on touch**

Find (in `UpcomingContests`):

```tsx
                                <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: `${style.color}1A`, color: style.color }} className="text-[10px] font-semibold hover:opacity-80 px-2 py-0.5 rounded-[4px] tracking-wide flex-shrink-0 flex items-center opacity-0 group-hover:opacity-100 transition-all uppercase">
```

Change `opacity-0 group-hover:opacity-100` to `opacity-100 sm:opacity-0 sm:group-hover:opacity-100`:

```tsx
                                <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: `${style.color}1A`, color: style.color }} className="text-[10px] font-semibold hover:opacity-80 px-2 py-0.5 rounded-[4px] tracking-wide flex-shrink-0 flex items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all uppercase">
```

- [ ] **Step 2: Let the platform toggle wrap / shrink on the narrowest screens**

Find the platform toggle wrapper:

```tsx
				<div className="flex justify-start">
					<div className="inline-flex bg-white/50 dark:bg-[#111]/50 backdrop-blur-md border border-gray-200 dark:border-white/[0.08] rounded-[10px] p-1 shadow-sm">
```

Replace the inner buttons' padding so labels shrink on mobile. Find the button className:

```tsx
							className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-[6px] transition-all duration-200 ${
```

Replace `px-4` with `px-2.5 sm:px-4`:

```tsx
							className={`px-2.5 sm:px-4 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-[6px] transition-all duration-200 ${
```

- [ ] **Step 3: Verify no other hover-only affordance hides a tap target**

Scan `components/DashboardCharts.tsx` for `opacity-0 group-hover:opacity-100`:

Run: `grep -n "opacity-0 group-hover:opacity-100" components/DashboardCharts.tsx`
Expected: no matches (the only one was the contest link, fixed in Step 1).

The Recent Activity card uses `opacity-60 group-hover:opacity-100` and `group-hover:text-white` for *decorative* emphasis only (the row is clickable as a whole, the links inside are always visible) — those are fine on touch and need no change.

- [ ] **Step 4: Verify build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Manual check**

Run `npm run dev`. At ~360px on `/dashboard` (with at least one upcoming contest): the "Join →" pill is visible without hovering; the platform toggle fits on one line without horizontal scroll; scroll the whole page — no horizontal overflow on the charts, heatmap, or Recent Activity.

- [ ] **Step 6: Commit**

```bash
git add components/DashboardCharts.tsx
git commit -m "fix: make dashboard contest link tappable and toggle fit on mobile"
```

---

## Self-Review Notes

- **Spec coverage:** Problems detail overlay (T1) — spec §A. Stat cards one row + responsive numbers/labels (T2) — spec §B.1. Contest Join link on touch (T3 Step 1) — spec §B.2. Platform toggle + hover-only audit + overflow check (T3 Steps 2–5) — spec §B.3. Desktop unchanged via `sm:`/`lg:` gating throughout. No backend/schema change.
- **Placeholder scan:** none — every step has exact find/replace class strings and commands.
- **Type consistency:** no types introduced; `ProblemDetail` props/`onClose` untouched in T1.
- **Testing:** no visual-test infra in repo (stated in spec); each task gates on `npm run build` plus a specific manual responsive check.
- **Note for executor:** the exact pixel sizes in T2 (`text-[34px]`, paddings) are a starting point; if the manual check shows clipping at 360px, nudge them down — that's expected fine-tuning, not a plan deviation.
