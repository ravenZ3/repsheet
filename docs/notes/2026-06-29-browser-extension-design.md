# Browser Extension — Architecture & Design

**Date:** 2026-06-29
**Status:** Design approved, pending implementation plan

## Goal

A cross-browser extension so existing Repsheet users can capture and FSRS-rate
problems the moment they solve them, and get review reminders — **without logging
in to the website repeatedly**.

## Locked decisions

| Area | Decision |
|------|----------|
| Primary jobs | (1) Capture-as-you-solve with FSRS rating, (2) Review reminders (badge + popup) |
| Capture mode | **Full capture** — extension creates the problem entry *and* rates it in one call (no waiting on sync) |
| Detection | **Auto-detect** the "Accepted" verdict on the problem page |
| Auth | **Piggyback on existing web login** via header-relayed session token + sign-in-redirect fallback |
| Targets | **Chrome + Firefox** from day one (MV3 + `webextension-polyfill`) |
| Dedupe key | Problem **URL (`link`) scoped to userId** — matches existing sync dedupe |

## Authentication

NextAuth uses the **`jwt` session strategy** (`lib/authOptions.ts`), so the
session cookie (`next-auth.session-token` / `__Secure-next-auth.session-token`)
is an **encrypted JWE** — there are no `Session` DB rows to look up. The cookie is
`httpOnly`, `SameSite=Lax`, `Secure`. `SameSite=Lax` means a cross-site `fetch`
from a LeetCode/Codeforces page to `repsheet.vercel.app` will NOT carry the cookie.

**Mechanism (approach A — header-relayed JWT):**
1. Background service worker reads the session cookie via the `cookies` API
   (can read `httpOnly`; content scripts cannot).
2. Resends the raw token as an `X-Repsheet-Session` header on API calls.
3. Backend shim `decode()`s it (`next-auth/jwt`) with `NEXTAUTH_SECRET`; the `jwt`
   callback already sets `token.id = user.id`, so the decoded payload yields the
   user id. Falls back to `getServerSession` for same-origin callers.

This sidesteps SameSite entirely, works identically in Chrome & Firefox, and
leaves the site's cookie/CSRF posture unchanged.

**Logged-out fallback:** popup shows a "Sign in" button that opens the website
login tab. After login, the cookie exists and piggyback works. No second auth
system, no backend OAuth work — true single-login.

```
Extension opens
  → valid session cookie? → yes → piggyback (header), show due-today
                          → no  → "Sign in" → opens site login tab → piggyback works
```

Rejected: full in-extension OAuth (would be a *second* login — the exact thing
we're eliminating — and requires NextAuth to issue tokens to a non-browser client).

## Architecture overview

```
┌─ Browser ─────────────────────────────┐         ┌─ repsheet.vercel.app ─────────┐
│  Content script (per platform)         │         │  POST /api/extension/capture  │
│   detects verdict, scrapes problem,    │──msg──┐ │  GET  /api/extension/summary  │
│   injects rating overlay               │       │ │  lib/extensionAuth.ts (shim)  │
│  Background service worker             │◀──────┘ │  lib/fsrs.ts (extracted)      │
│   auth (cookie→header), API client,    │──HTTPS─▶│                               │
│   badge, alarms                        │  X-Repsheet-Session header              │
│  Popup (mini dashboard + sign-in)      │         └───────────────────────────────┘
└────────────────────────────────────────┘
```

## Extension components

- **manifest (Chrome + Firefox variants)** — `host_permissions`: `leetcode.com`,
  `codeforces.com`, Repsheet domain; `permissions`: `cookies`, `storage`,
  `alarms`. One codebase via `webextension-polyfill`.
- **Platform adapters** (`adapters/leetcode.ts`, `adapters/codeforces.ts`) — each
  exports a **selector contract**: `detectVerdict()`, `scrapeProblem() →
  {name, url, difficulty, tags}`. All fragile DOM logic quarantined here so a site
  redesign = patch one file.
- **Content script** — runs an adapter, watches for "Accepted" via
  `MutationObserver`, injects the **rating overlay** (4 FSRS buttons), messages
  the background worker on click.
- **Background service worker** — owns auth + API client, runs an `alarms` timer
  to refresh the due-count **badge**, brokers messages.
- **Popup** — due-today, reviewed-today, recent activity, "Open Repsheet";
  shows "Sign in" when no session.

## Backend additions (additive only — web behavior unchanged)

1. **`lib/fsrs.ts`** — extract the FSRS scheduling block currently inline in
   `app/review/mark/route.ts` into a shared `scheduleReview(problem, rating,
   retention)` helper. Used by both web review and extension capture.
2. **`lib/extensionAuth.ts`** — `getUserIdFromRequest(req)`: try
   `getServerSession`; else read `X-Repsheet-Session` header → `decode()` the JWT
   with `NEXTAUTH_SECRET` → return `token.id`.
3. **`POST /api/extension/capture`** — body `{name, platform, link, difficulty,
   tags, rating}`. Upserts Problem by `(userId, link)`, applies `scheduleReview`,
   creates a `Review`. Atomic → no race with sync, instant feel.
4. **`GET /api/extension/summary`** — `{dueToday, reviewedToday, recent[]}` for
   the badge + popup.
5. **CORS** — these endpoints answer `OPTIONS` preflight and allow the
   `chrome-extension://` / `moz-extension://` origin for the custom header.

## Data flow — capture

```
solve on LeetCode → content script sees "Accepted" → scrapeProblem()
  → overlay appears → user taps "Good"
  → message to background → POST /api/extension/capture (session header)
  → backend upserts problem by URL + schedules FSRS + writes Review
  → 200 → overlay shows "✓ Scheduled · next review in 3d"
```

## Difficulty / tags mapping

Codeforces has no Easy/Medium/Hard. Reuse the CF sync's existing rating→difficulty
mapping by extracting it into a shared helper, so extension and sync never disagree.

## Known risks

- **DOM fragility** (accepted) — isolated to the two adapter files; documented
  selector contract makes patching quick.
- **Codeforces verdict detection** — verdict often lands on the submissions page,
  not inline; adapter may need to watch the submissions row or poll the user's last
  submission. Exact strategy to be specified in the plan.
- **Session expiry** — gone cookie → capture returns 401 → overlay shows
  "Sign in" → opens website. No data loss (problem still syncs later).

## Out of scope (YAGNI)

Inline due-problem highlighting, push notifications, in-extension settings UI,
full OAuth.

## Relevant existing code

- Rating + FSRS: `app/review/mark/route.ts` (`POST {id, rating}`)
- Problem create: `app/api/problem/route.ts`
- Sync dedupe by `link`: `app/api/sync/codeforces/route.ts:72`
- Auth options: `lib/authOptions.ts`
- Schema: `prisma/schema.prisma` (`Problem`, `Review`, `Session`)
