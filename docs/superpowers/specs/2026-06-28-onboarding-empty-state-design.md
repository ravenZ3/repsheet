# Onboarding Empty State — Design

**Date:** 2026-06-28
**Status:** Approved (design); pending implementation plan

## Summary

New users sign up and go dormant: of the first 11 accounts, one is a power user
and the rest added 0–1 problems and left. Root cause is an **activation gap** —
the only path to populating an account (entering a LeetCode/Codeforces handle and
hitting Sync) is buried behind the Settings gear icon, and an empty account shows
bare charts / an empty list with no guidance.

This feature adds a **contextual empty state**: when an account has zero problems,
the Dashboard and Problems pages render a focused "connect & sync a platform" card
instead of empty UI. The activation moment we optimize for is **connect & sync** —
the lowest-effort, highest-payoff way for a newcomer to see value (their solved
history populates in seconds).

The empty state is **count-driven and stateless** — shown when the account's
problem count is 0, gone the instant data lands. No schema change, no
`hasOnboarded` flag, no migration.

## Goals

- Put connect-&-sync front and center for empty accounts on the two surfaces a new
  user actually lands on (Dashboard, Problems).
- Reuse existing sync endpoints; no backend changes.
- Provide a manual-add fallback for users who don't use LeetCode/Codeforces.
- Leave the experience unchanged the moment an account has any problems.

## Non-Goals (deferred follow-ups)

- A first-run welcome modal/wizard or a persistent multi-step checklist.
- Onboarding empty state on the Review page (its "nothing due" state is already
  defensible).
- Rewiring `SettingsDialog` onto the shared sync helper (the helper is introduced
  here; migrating Settings to it is an optional later cleanup).
- Any schema/migration work.

## Architecture

Count-driven empty state + one reusable client card + a thin shared sync helper.

### 1. `components/OnboardingPanel.tsx` (client)

The single reusable empty-state card, rendered by both server pages when the
account is empty.

- Welcome headline + one-line subtext (e.g. "Connect your LeetCode or Codeforces
  to pull in everything you've already solved").
- A **LeetCode handle** text input and a **Codeforces handle** text input.
- A **Sync** button, disabled until at least one handle is non-empty; shows a
  spinner while running.
- A secondary **"or add your first problem manually →"** link to `/add`.
- On success → `toast.success` with the synced count, then
  `window.location.reload()` so the now-populated page renders (matches the
  existing `SettingsDialog` pattern).
- On error → `toast.error(message)`, stays on the panel.

### 2. `lib/syncClient.ts` — shared sync helper

The connect-&-sync sequence currently lives inline inside `SettingsDialog`,
entangled with its lock/unlock UI. Extract the **call sequence** (only) into:

```ts
export interface ConnectAndSyncInput {
  leetcodeUsername?: string
  codeforcesHandle?: string
}
export interface SyncResult { synced: number; skipped: number }

export async function connectAndSync(input: ConnectAndSyncInput): Promise<SyncResult>
```

Behavior:
1. Build a PATCH body from whichever handles are present (trimmed, non-empty) and
   `PATCH /api/settings`. If the response is not ok, throw with the server's
   `error` message (this is where Codeforces handle validation surfaces).
2. For each present handle, `POST` to `/api/sync/leetcode` and/or
   `/api/sync/codeforces`. If any result has an `error`, throw it.
3. Aggregate `synced` and `skipped` across results and return them.
4. A platform with no handle is skipped entirely (no PATCH field, no POST).

`OnboardingPanel` consumes this helper. `SettingsDialog` is left untouched and
keeps its own inline flow.

### 3. Server wiring (no schema change)

- `app/dashboard/page.tsx`: add an **unfiltered** problem count
  (`prisma.problem.count({ where: { userId } })`). If `0`, render
  `<OnboardingPanel />` in place of `<DashboardCharts>`. Counting unfiltered (not
  the platform-filtered `problems`) avoids showing onboarding when an existing
  user merely filters to a platform they have none of.
- `app/problems/page.tsx`: it already computes `totalProblems`. If
  `totalProblems === 0`, render `<OnboardingPanel />` in place of
  `<ProblemsClient>`.

## Data Flow

```
new user (0 problems) ─▶ Dashboard/Problems server page
                          │  count == 0?
                          ▼ yes
                    <OnboardingPanel/>
                          │  user enters handle(s), clicks Sync
                          ▼
                 lib/syncClient.connectAndSync()
                   │ PATCH /api/settings (save handles)
                   │ POST  /api/sync/leetcode  (if LC handle)
                   │ POST  /api/sync/codeforces (if CF handle)
                   ▼
              { synced, skipped } ─▶ toast + window.location.reload()
                          │
                          ▼ count now > 0 ─▶ normal Dashboard / Problems
```

## Error Handling

- No handle entered → Sync button disabled.
- Bad/invalid handle or Codeforces validation failure → server returns an error;
  `connectAndSync` throws it; panel shows `toast.error` and stays.
- Sync succeeds but returns 0 new problems (e.g. wrong-but-valid handle, no
  accepted submissions) → reload occurs; the empty state simply reappears. The
  success toast reports `Synced 0`. Acceptable; no special-casing.
- Manual-add link is always available as a fallback path.

## Testing

- **TDD `lib/syncClient.ts`** with a mocked global `fetch` (Vitest, node env):
  - aggregates `synced`/`skipped` across both platforms;
  - skips a platform whose handle is absent (no POST to it);
  - throws when the settings PATCH response is not ok;
  - throws when a sync response body contains `error`.
- `OnboardingPanel` and the two server pages: verified via `npm run build` and a
  manual click-through (consistent with the repo's no-component-test norm). Manual
  check: an empty account shows the panel on both pages; after a successful sync
  the panel is replaced by populated UI; an account with problems never sees it.

## Files

- Create: `components/OnboardingPanel.tsx`
- Create: `lib/syncClient.ts`
- Create: `lib/syncClient.test.ts`
- Modify: `app/dashboard/page.tsx` (empty-count branch)
- Modify: `app/problems/page.tsx` (empty-count branch)
