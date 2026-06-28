# Onboarding Empty State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an account has zero problems, show a connect-&-sync card on the Dashboard and Problems pages instead of empty UI, so new users activate.

**Architecture:** A count-driven, stateless empty state. A thin `connectAndSync` client helper (TDD'd) wraps the existing settings + sync endpoints; a reusable `OnboardingPanel` client component uses it; the two server pages render the panel when their problem count is 0. No schema change.

**Tech Stack:** Next.js 16 (App Router, React 19), Prisma + MongoDB, Vitest, Tailwind v4, sonner (toasts), lucide-react.

## Global Constraints

- No schema/migration changes; empty state is driven purely by problem count == 0.
- Reuse existing endpoints: `PATCH /api/settings`, `POST /api/sync/leetcode`, `POST /api/sync/codeforces`. Each sync endpoint returns `{ success, synced, skipped }` on success or `{ error }` on failure, and reads the handle saved via the prior PATCH.
- Leave `SettingsDialog` untouched (helper is introduced, not wired into Settings).
- Dashboard empty check uses an **unfiltered** problem count (not the platform-filtered list).
- Do **not** add Co-Authored-By trailers to commits. Work on branch `feat/onboarding-empty-state`.
- Surfaces in scope: Dashboard and Problems only (not Review).

---

## File Structure

- `lib/syncClient.ts` — `connectAndSync()` helper (save handles + trigger syncs + aggregate).
- `lib/syncClient.test.ts` — unit tests (mocked `fetch`).
- `components/OnboardingPanel.tsx` — reusable empty-state card.
- `app/dashboard/page.tsx` — render panel when unfiltered count is 0.
- `app/problems/page.tsx` — render panel when `totalProblems` is 0.

---

### Task 1: `connectAndSync` helper

**Files:**
- Create: `lib/syncClient.ts`
- Create: `lib/syncClient.test.ts`

**Interfaces:**
- Produces:
  - `interface ConnectAndSyncInput { leetcodeUsername?: string; codeforcesHandle?: string }`
  - `interface SyncResult { synced: number; skipped: number }`
  - `connectAndSync(input: ConnectAndSyncInput): Promise<SyncResult>`

- [ ] **Step 1: Write the failing tests `lib/syncClient.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { connectAndSync } from "./syncClient"

type Resp = { ok: boolean; json: () => Promise<unknown> }
const res = (ok: boolean, body: unknown): Resp => ({ ok, json: async () => body })

let calls: { url: string; method: string }[] = []

function mock(routes: Record<string, Resp>) {
  calls = []
  global.fetch = vi.fn(async (url: string, opts?: { method?: string }) => {
    calls.push({ url, method: opts?.method ?? "GET" })
    const r = routes[url]
    if (!r) throw new Error(`unexpected fetch: ${url}`)
    return r as unknown as Response
  }) as unknown as typeof fetch
}

beforeEach(() => { calls = [] })

describe("connectAndSync", () => {
  it("aggregates synced/skipped across both platforms", async () => {
    mock({
      "/api/settings": res(true, {}),
      "/api/sync/leetcode": res(true, { success: true, synced: 3, skipped: 1 }),
      "/api/sync/codeforces": res(true, { success: true, synced: 2, skipped: 0 }),
    })
    const out = await connectAndSync({ leetcodeUsername: "ravenZ3", codeforcesHandle: "ravenZ3" })
    expect(out).toEqual({ synced: 5, skipped: 1 })
  })

  it("skips a platform whose handle is absent (no POST to it)", async () => {
    mock({
      "/api/settings": res(true, {}),
      "/api/sync/leetcode": res(true, { success: true, synced: 1, skipped: 0 }),
    })
    await connectAndSync({ leetcodeUsername: "ravenZ3" })
    expect(calls.some((c) => c.url === "/api/sync/codeforces")).toBe(false)
    expect(calls.some((c) => c.url === "/api/sync/leetcode" && c.method === "POST")).toBe(true)
  })

  it("throws the server message when the settings PATCH fails", async () => {
    mock({ "/api/settings": res(false, { error: "Codeforces verification failed: Handle not found" }) })
    await expect(connectAndSync({ codeforcesHandle: "nope" })).rejects.toThrow("Codeforces verification failed: Handle not found")
  })

  it("throws when a sync response body contains an error", async () => {
    mock({
      "/api/settings": res(true, {}),
      "/api/sync/leetcode": res(true, { error: "Sync pipeline failed" }),
    })
    await expect(connectAndSync({ leetcodeUsername: "ravenZ3" })).rejects.toThrow("Sync pipeline failed")
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL ("does not provide an export named 'connectAndSync'").

- [ ] **Step 3: Implement `lib/syncClient.ts`**

```ts
export interface ConnectAndSyncInput {
  leetcodeUsername?: string
  codeforcesHandle?: string
}

export interface SyncResult {
  synced: number
  skipped: number
}

interface SyncResponse {
  synced?: number
  skipped?: number
  error?: string
}

export async function connectAndSync(input: ConnectAndSyncInput): Promise<SyncResult> {
  const lc = input.leetcodeUsername?.trim()
  const cf = input.codeforcesHandle?.trim()

  const patchBody: Record<string, string> = {}
  if (lc) patchBody.leetcodeUsername = lc
  if (cf) patchBody.codeforcesHandle = cf

  const settingsRes = await fetch("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patchBody),
  })
  if (!settingsRes.ok) {
    const err = (await settingsRes.json().catch(() => ({}))) as SyncResponse
    throw new Error(err.error || "Failed to save handles")
  }

  const results: SyncResponse[] = []
  if (lc) {
    const r = await fetch("/api/sync/leetcode", { method: "POST" })
    results.push((await r.json()) as SyncResponse)
  }
  if (cf) {
    const r = await fetch("/api/sync/codeforces", { method: "POST" })
    results.push((await r.json()) as SyncResponse)
  }

  const failed = results.find((r) => r.error)
  if (failed) throw new Error(failed.error)

  return {
    synced: results.reduce((n, r) => n + (r.synced || 0), 0),
    skipped: results.reduce((n, r) => n + (r.skipped || 0), 0),
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (4 new tests; existing pattern tests still pass).

- [ ] **Step 5: Commit**

```bash
git add lib/syncClient.ts lib/syncClient.test.ts
git commit -m "feat: add connectAndSync client helper for onboarding"
```

---

### Task 2: `OnboardingPanel` component

**Files:**
- Create: `components/OnboardingPanel.tsx`

**Interfaces:**
- Consumes: `connectAndSync` from `@/lib/syncClient` (Task 1).
- Produces: default export `OnboardingPanel` (a client component, no props).

- [ ] **Step 1: Create `components/OnboardingPanel.tsx`**

```tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, ArrowRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { connectAndSync } from "@/lib/syncClient"

export default function OnboardingPanel() {
  const [leetcode, setLeetcode] = useState("")
  const [codeforces, setCodeforces] = useState("")
  const [syncing, setSyncing] = useState(false)

  const canSync = !!(leetcode.trim() || codeforces.trim()) && !syncing

  const handleSync = async () => {
    setSyncing(true)
    try {
      const { synced, skipped } = await connectAndSync({
        leetcodeUsername: leetcode,
        codeforcesHandle: codeforces,
      })
      toast.success(`Synced ${synced} problems. ${skipped} skipped.`)
      setTimeout(() => window.location.reload(), 1200)
    } catch (e) {
      toast.error((e as Error).message || "Sync failed")
      setSyncing(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto mt-10 px-4">
      <div className="rounded-[16px] border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] shadow-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent mix-blend-overlay pointer-events-none" />

        <h1 className="text-2xl italic text-gray-900 dark:text-white [font-family:var(--font-playfair)]">
          Welcome to RepSheet
        </h1>
        <p className="text-[13px] text-gray-500 dark:text-[#888] mt-2 mb-6">
          Connect your LeetCode or Codeforces to pull in everything you&apos;ve already
          solved. We&apos;ll schedule reviews so you stop forgetting them.
        </p>

        <div className="flex flex-col gap-3 max-w-sm">
          <Input
            placeholder="LeetCode handle"
            value={leetcode}
            onChange={(e) => setLeetcode(e.target.value)}
            disabled={syncing}
            className="bg-gray-50 dark:bg-white/[0.03] border-[#ffa116]/20 text-sm h-9"
          />
          <Input
            placeholder="Codeforces handle"
            value={codeforces}
            onChange={(e) => setCodeforces(e.target.value)}
            disabled={syncing}
            className="bg-gray-50 dark:bg-white/[0.03] border-[#318ce7]/20 text-sm h-9"
          />
          <Button
            onClick={handleSync}
            disabled={!canSync}
            className="w-full bg-[#10b981] hover:bg-[#059669] text-white shadow-sm h-9 text-[13px] mt-1"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Connect & Sync"}
          </Button>
        </div>

        <Link
          href="/add"
          className="inline-flex items-center gap-1 text-[12px] text-gray-500 dark:text-[#666] hover:text-gray-900 dark:hover:text-white mt-5 transition-colors"
        >
          or add your first problem manually
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/OnboardingPanel.tsx
git commit -m "feat: add OnboardingPanel connect-and-sync card"
```

---

### Task 3: Wire empty state into Dashboard and Problems

**Files:**
- Modify: `app/dashboard/page.tsx`
- Modify: `app/problems/page.tsx`

**Interfaces:**
- Consumes: `OnboardingPanel` (Task 2).

- [ ] **Step 1: Import the panel in `app/dashboard/page.tsx`**

Add to the imports at the top (after the `DashboardCharts` import):

```tsx
import OnboardingPanel from "@/components/OnboardingPanel"
```

- [ ] **Step 2: Add the empty-count early return in `app/dashboard/page.tsx`**

Immediately after the session guard block:

```tsx
	if (!session || !session.user?.id) {
		redirect("/login")
	}
```

insert:

```tsx
	const totalProblemCount = await prisma.problem.count({ where: { userId: session.user.id } })
	if (totalProblemCount === 0) {
		return <OnboardingPanel />
	}
```

- [ ] **Step 3: Import the panel in `app/problems/page.tsx`**

Add after the `ProblemsClient` import:

```tsx
import OnboardingPanel from "@/components/OnboardingPanel"
```

- [ ] **Step 4: Add the empty-count branch in `app/problems/page.tsx`**

After the `Promise.all([...])` that computes `paginatedProblems` and `totalProblems`, before the existing `return (`:

```tsx
	if (totalProblems === 0) {
		return <OnboardingPanel />
	}
```

- [ ] **Step 5: Verify build compiles**

Run: `npm run build`
Expected: build succeeds; `/dashboard` and `/problems` still listed.

- [ ] **Step 6: Manual end-to-end check**

With `npm run dev`, log in as an account with **0 problems** (or temporarily test by pointing at an empty account): both `/dashboard` and `/problems` show the OnboardingPanel. Enter a valid LeetCode handle → Connect & Sync → success toast → page reloads → charts/list now populated and the panel is gone. An account that already has problems never sees the panel.

- [ ] **Step 7: Commit**

```bash
git add app/dashboard/page.tsx app/problems/page.tsx
git commit -m "feat: show onboarding empty state on dashboard and problems"
```

---

## Self-Review Notes

- **Spec coverage:** OnboardingPanel (T2) — welcome copy, two handle inputs, disabled-until-handle Sync button, manual-add link, success reload, error toast. Shared helper `connectAndSync` (T1) — PATCH handles, conditional POSTs, aggregate, throw on PATCH-not-ok and on sync-body error, skip absent platform. Server wiring (T3) — unfiltered count on Dashboard, `totalProblems` on Problems, render panel when 0. No schema change. SettingsDialog untouched.
- **Placeholder scan:** none — all steps carry full code/commands.
- **Type consistency:** `ConnectAndSyncInput`/`SyncResult`/`connectAndSync` names match between T1 definition and T2 usage; `OnboardingPanel` default export matches T3 imports.
- **Testing:** helper TDD'd with mocked fetch (T1); panel + pages via build + manual (T2/T3), consistent with repo's no-component-test norm.
