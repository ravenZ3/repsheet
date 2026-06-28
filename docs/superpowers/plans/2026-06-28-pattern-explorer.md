# Pattern Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in Pattern Explorer that overlays the user's solved problems onto the automedon technique catalog, showing per-pattern coverage plus FSRS review health.

**Architecture:** A static catalog (automedon markdown → committed JSON) is overlaid in memory against the user's `Problem` records at page load. Pure functions compute slug-matching and per-pattern status; a server component gates on a new `User.showPatterns` flag and renders a client accordion view. No catalog DB rows, no runtime fetch.

**Tech Stack:** Next.js 16 (App Router, React 19), Prisma + MongoDB, NextAuth (JWT), TypeScript, Vitest (new), Tailwind v4, Radix accordion.

## Global Constraints

- Catalog source: **automedon** only this iteration; architecture must allow a second source (seanprashad) by adding a JSON + registering it. No source dropdown.
- Feature is **off by default** (`showPatterns @default(false)`); core Dictionary unchanged for non-opted-in users.
- Match LeetCode problems only, by slug from `Problem.link`, normalized-name fallback.
- Status values derive solely from existing `Problem` fields (`nextReviewDate`, `lastRating`).
- Difficulty strings are exactly `Easy` | `Medium` | `Hard` (matches Prisma `Difficulty` enum).
- Do **not** add Co-Authored-By trailers to commits. Work on branch `feat/pattern-explorer`.
- No new runtime dependencies for UI (no `@radix-ui/react-switch`); reuse existing button/toggle styling.

---

## File Structure

- `vitest.config.ts` — Vitest config (new test infra).
- `lib/patterns/types.ts` — catalog + view-model types.
- `scripts/build-pattern-catalog.ts` — fetch+parse automedon markdown → JSON.
- `lib/patterns/catalogs/automedon.json` — committed generated catalog.
- `lib/patterns/index.ts` — catalog registry (`getCatalog`).
- `lib/patterns/match.ts` — pure matching + status + aggregation.
- `lib/patterns/match.test.ts` — unit tests for match.ts.
- `lib/patterns/index.test.ts` — catalog-shape test.
- `prisma/schema.prisma` — add `User.showPatterns`.
- `app/api/settings/route.ts` — read/write `showPatterns`.
- `components/SettingsDialog.tsx` — toggle row.
- `components/Navbar.tsx` — conditional Patterns link.
- `app/patterns/page.tsx` — server gate + data load.
- `app/patterns/PatternsClient.tsx` — accordion UI.

---

### Task 1: Test infrastructure + catalog foundation

**Files:**
- Create: `vitest.config.ts`
- Create: `lib/patterns/types.ts`
- Create: `scripts/build-pattern-catalog.ts`
- Create: `lib/patterns/catalogs/automedon.json` (generated)
- Create: `lib/patterns/index.ts`
- Create: `lib/patterns/index.test.ts`
- Modify: `package.json` (add `test` script + devDeps)

**Interfaces:**
- Produces: types `CatalogProblem`, `CatalogPattern`, `Catalog`; function `getCatalog(): Catalog`.

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest@^3
```

- [ ] **Step 2: Add test script to package.json**

In `package.json` `"scripts"`, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
})
```

- [ ] **Step 4: Create `lib/patterns/types.ts`**

```ts
export type Difficulty = "Easy" | "Medium" | "Hard"

export interface CatalogProblem {
  name: string
  slug: string
  url: string
  difficulty: Difficulty
}

export interface CatalogPattern {
  id: string
  name: string
  problems: CatalogProblem[]
}

export interface Catalog {
  source: string
  generatedAt: string
  patterns: CatalogPattern[]
}
```

- [ ] **Step 5: Create `scripts/build-pattern-catalog.ts`**

```ts
/**
 * Fetches the automedon ultimate-leetcode-patterns markdown and emits a
 * normalized catalog JSON. Run: `npx ts-node scripts/build-pattern-catalog.ts`
 */
import { writeFileSync, mkdirSync } from "fs"
import { join } from "path"
import type { Catalog, CatalogPattern, Difficulty } from "../lib/patterns/types"

const SOURCE_URL =
  "https://raw.githubusercontent.com/Automedon/ultimate-leetcode-patterns/main/Readme.md"

const HEAD = /^##\s+(\d+)\.\s+(.+?)\s*$/
const PROB =
  /^\d+\.\s+\[(.+?)\]\((https:\/\/leetcode\.com\/problems\/([^/)]+)\/?)\)\s+\((Easy|Medium|Hard)\)\s*$/

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

async function main() {
  const res = await fetch(SOURCE_URL)
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  const md = await res.text()

  const patterns: CatalogPattern[] = []
  let cur: CatalogPattern | null = null

  for (const line of md.split(/\r?\n/)) {
    const h = line.match(HEAD)
    if (h) {
      cur = { id: slugify(h[2]), name: h[2], problems: [] }
      patterns.push(cur)
      continue
    }
    const p = line.match(PROB)
    if (p && cur) {
      cur.problems.push({
        name: p[1],
        url: p[2],
        slug: p[3],
        difficulty: p[4] as Difficulty,
      })
    }
  }

  if (patterns.length !== 41)
    throw new Error(`Expected 41 patterns, got ${patterns.length}`)
  const total = patterns.reduce((n, x) => n + x.problems.length, 0)
  if (total !== 820) throw new Error(`Expected 820 problems, got ${total}`)

  const catalog: Catalog = {
    source: "automedon",
    generatedAt: new Date().toISOString(),
    patterns,
  }

  const dir = join(process.cwd(), "lib/patterns/catalogs")
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, "automedon.json"), JSON.stringify(catalog, null, 2) + "\n")
  console.log(`Wrote ${patterns.length} patterns / ${total} problems`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

- [ ] **Step 6: Generate the catalog JSON**

Run: `npx ts-node scripts/build-pattern-catalog.ts`
Expected: `Wrote 41 patterns / 820 problems` and `lib/patterns/catalogs/automedon.json` exists.

- [ ] **Step 7: Create `lib/patterns/index.ts`**

```ts
import type { Catalog } from "./types"
import automedon from "./catalogs/automedon.json"

// Registry of available catalogs. Add seanprashad here later — downstream
// code is source-agnostic and only depends on the Catalog shape.
const CATALOGS: Record<string, Catalog> = {
  automedon: automedon as Catalog,
}

export const DEFAULT_CATALOG = "automedon"

export function getCatalog(source: string = DEFAULT_CATALOG): Catalog {
  const c = CATALOGS[source]
  if (!c) throw new Error(`Unknown catalog source: ${source}`)
  return c
}
```

- [ ] **Step 8: Ensure JSON import works — add to `tsconfig.json` if needed**

Confirm `tsconfig.json` `compilerOptions` has `"resolveJsonModule": true` (Next.js presets include it). If absent, add it.

- [ ] **Step 9: Write the catalog-shape test `lib/patterns/index.test.ts`**

```ts
import { describe, it, expect } from "vitest"
import { getCatalog } from "./index"

describe("getCatalog", () => {
  it("loads the automedon catalog with 41 patterns and 820 problems", () => {
    const c = getCatalog()
    expect(c.source).toBe("automedon")
    expect(c.patterns).toHaveLength(41)
    const total = c.patterns.reduce((n, p) => n + p.problems.length, 0)
    expect(total).toBe(820)
  })

  it("every problem has name, slug, url and valid difficulty", () => {
    const c = getCatalog()
    for (const pat of c.patterns) {
      expect(pat.id).toBeTruthy()
      for (const pr of pat.problems) {
        expect(pr.name).toBeTruthy()
        expect(pr.slug).toBeTruthy()
        expect(pr.url).toContain("leetcode.com/problems/")
        expect(["Easy", "Medium", "Hard"]).toContain(pr.difficulty)
      }
    }
  })

  it("throws on unknown source", () => {
    expect(() => getCatalog("nope")).toThrow()
  })
})
```

- [ ] **Step 10: Run the test**

Run: `npm test`
Expected: PASS (3 tests).

- [ ] **Step 11: Commit**

```bash
git add vitest.config.ts package.json package-lock.json lib/patterns/types.ts scripts/build-pattern-catalog.ts lib/patterns/catalogs/automedon.json lib/patterns/index.ts lib/patterns/index.test.ts
git commit -m "feat: add automedon pattern catalog + build script and test infra"
```

---

### Task 2: Matching primitives (slug extraction, name normalization, index)

**Files:**
- Create: `lib/patterns/match.ts`
- Create: `lib/patterns/match.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (operates on a minimal subset of `Problem`).
- Produces:
  - `extractLeetcodeSlug(link: string | null | undefined): string | null`
  - `normalizeName(name: string): string`
  - `type MatchableProblem = { id: string; name: string; link: string | null; platform: string | null; nextReviewDate: Date | null; lastRating: number | null }`
  - `buildProblemIndex(problems: MatchableProblem[]): { bySlug: Map<string, MatchableProblem>; byName: Map<string, MatchableProblem> }`

- [ ] **Step 1: Write failing tests `lib/patterns/match.test.ts`**

```ts
import { describe, it, expect } from "vitest"
import { extractLeetcodeSlug, normalizeName, buildProblemIndex } from "./match"
import type { MatchableProblem } from "./match"

describe("extractLeetcodeSlug", () => {
  it("extracts slug with trailing slash", () => {
    expect(extractLeetcodeSlug("https://leetcode.com/problems/two-sum/")).toBe("two-sum")
  })
  it("extracts slug without trailing slash", () => {
    expect(extractLeetcodeSlug("https://leetcode.com/problems/two-sum")).toBe("two-sum")
  })
  it("extracts slug with /description suffix", () => {
    expect(extractLeetcodeSlug("https://leetcode.com/problems/4sum-ii/description/")).toBe("4sum-ii")
  })
  it("ignores query strings", () => {
    expect(extractLeetcodeSlug("https://leetcode.com/problems/two-sum/?envType=list")).toBe("two-sum")
  })
  it("returns null for non-leetcode links", () => {
    expect(extractLeetcodeSlug("https://codeforces.com/problemset/problem/1/A")).toBeNull()
  })
  it("returns null for null/empty", () => {
    expect(extractLeetcodeSlug(null)).toBeNull()
    expect(extractLeetcodeSlug("")).toBeNull()
  })
})

describe("normalizeName", () => {
  it("lowercases and strips punctuation/whitespace", () => {
    expect(normalizeName("Insert Delete GetRandom O(1)")).toBe("insertdeletegetrandomo1")
  })
  it("matches across spacing differences", () => {
    expect(normalizeName("Two  Sum")).toBe(normalizeName("two sum"))
  })
})

describe("buildProblemIndex", () => {
  const problems: MatchableProblem[] = [
    { id: "a", name: "Two Sum", link: "https://leetcode.com/problems/two-sum/", platform: "leetcode", nextReviewDate: null, lastRating: null },
    { id: "b", name: "Group Anagrams", link: null, platform: "leetcode", nextReviewDate: null, lastRating: null },
    { id: "c", name: "Watermelon", link: "https://codeforces.com/x", platform: "codeforces", nextReviewDate: null, lastRating: null },
  ]
  it("indexes leetcode problems by slug", () => {
    const idx = buildProblemIndex(problems)
    expect(idx.bySlug.get("two-sum")?.id).toBe("a")
  })
  it("indexes all problems by normalized name", () => {
    const idx = buildProblemIndex(problems)
    expect(idx.byName.get(normalizeName("Group Anagrams"))?.id).toBe("b")
  })
  it("does not index non-leetcode links by slug", () => {
    const idx = buildProblemIndex(problems)
    expect(idx.bySlug.has("x")).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL ("does not provide an export named 'extractLeetcodeSlug'").

- [ ] **Step 3: Implement `lib/patterns/match.ts`**

```ts
export interface MatchableProblem {
  id: string
  name: string
  link: string | null
  platform: string | null
  nextReviewDate: Date | null
  lastRating: number | null
}

const SLUG_RE = /leetcode\.com\/problems\/([^/?#]+)/

export function extractLeetcodeSlug(link: string | null | undefined): string | null {
  if (!link) return null
  const m = link.match(SLUG_RE)
  return m ? m[1] : null
}

export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "")
}

export function buildProblemIndex(problems: MatchableProblem[]): {
  bySlug: Map<string, MatchableProblem>
  byName: Map<string, MatchableProblem>
} {
  const bySlug = new Map<string, MatchableProblem>()
  const byName = new Map<string, MatchableProblem>()
  for (const p of problems) {
    const slug = extractLeetcodeSlug(p.link)
    if (slug && !bySlug.has(slug)) bySlug.set(slug, p)
    const key = normalizeName(p.name)
    if (key && !byName.has(key)) byName.set(key, p)
  }
  return { bySlug, byName }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/patterns/match.ts lib/patterns/match.test.ts
git commit -m "feat: add pattern matching primitives (slug, name index)"
```

---

### Task 3: Status overlay + pattern view aggregation

**Files:**
- Modify: `lib/patterns/match.ts`
- Modify: `lib/patterns/match.test.ts`

**Interfaces:**
- Consumes: `MatchableProblem`, `buildProblemIndex` (Task 2); `Catalog`, `CatalogPattern` (Task 1).
- Produces:
  - `interface CatalogProblemView { name: string; slug: string; url: string; difficulty: string; status: "solved" | "not-solved"; due: boolean; struggling: boolean; problemId: string | null }`
  - `interface PatternView { id: string; name: string; total: number; solved: number; due: number; struggling: number; problems: CatalogProblemView[] }`
  - `buildPatternView(catalog: Catalog, problems: MatchableProblem[], now: Date): PatternView[]`

- [ ] **Step 1: Write failing tests (append to `lib/patterns/match.test.ts`)**

```ts
import { buildPatternView } from "./match"
import type { Catalog } from "./types"

const NOW = new Date("2026-06-28T12:00:00.000Z")
const PAST = new Date("2026-06-20T00:00:00.000Z")
const FUTURE = new Date("2026-07-10T00:00:00.000Z")

const catalog: Catalog = {
  source: "test",
  generatedAt: NOW.toISOString(),
  patterns: [
    {
      id: "sliding-window",
      name: "Sliding Window",
      problems: [
        { name: "Two Sum", slug: "two-sum", url: "https://leetcode.com/problems/two-sum/", difficulty: "Easy" },
        { name: "Group Anagrams", slug: "group-anagrams", url: "https://leetcode.com/problems/group-anagrams/", difficulty: "Medium" },
        { name: "First Missing Positive", slug: "first-missing-positive", url: "https://leetcode.com/problems/first-missing-positive/", difficulty: "Hard" },
      ],
    },
  ],
}

describe("buildPatternView", () => {
  it("marks a slug-matched problem solved, due when nextReviewDate is past", () => {
    const view = buildPatternView(catalog, [
      { id: "p1", name: "Two Sum", link: "https://leetcode.com/problems/two-sum/", platform: "leetcode", nextReviewDate: PAST, lastRating: 3 },
    ], NOW)
    const p = view[0].problems.find((x) => x.slug === "two-sum")!
    expect(p.status).toBe("solved")
    expect(p.due).toBe(true)
    expect(p.problemId).toBe("p1")
  })

  it("does not mark due when nextReviewDate is in the future", () => {
    const view = buildPatternView(catalog, [
      { id: "p1", name: "Two Sum", link: "https://leetcode.com/problems/two-sum/", platform: "leetcode", nextReviewDate: FUTURE, lastRating: 3 },
    ], NOW)
    expect(view[0].problems.find((x) => x.slug === "two-sum")!.due).toBe(false)
  })

  it("marks struggling when lastRating is 1", () => {
    const view = buildPatternView(catalog, [
      { id: "p1", name: "Two Sum", link: "https://leetcode.com/problems/two-sum/", platform: "leetcode", nextReviewDate: PAST, lastRating: 1 },
    ], NOW)
    const p = view[0].problems.find((x) => x.slug === "two-sum")!
    expect(p.struggling).toBe(true)
    expect(p.due).toBe(true)
  })

  it("falls back to normalized-name match when link is missing", () => {
    const view = buildPatternView(catalog, [
      { id: "p2", name: "Group Anagrams", link: null, platform: "leetcode", nextReviewDate: null, lastRating: null },
    ], NOW)
    expect(view[0].problems.find((x) => x.slug === "group-anagrams")!.status).toBe("solved")
  })

  it("marks unmatched catalog problems not-solved", () => {
    const view = buildPatternView(catalog, [], NOW)
    const p = view[0].problems.find((x) => x.slug === "first-missing-positive")!
    expect(p.status).toBe("not-solved")
    expect(p.problemId).toBeNull()
  })

  it("aggregates per-pattern counts", () => {
    const view = buildPatternView(catalog, [
      { id: "p1", name: "Two Sum", link: "https://leetcode.com/problems/two-sum/", platform: "leetcode", nextReviewDate: PAST, lastRating: 1 },
    ], NOW)
    expect(view[0]).toMatchObject({ total: 3, solved: 1, due: 1, struggling: 1 })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL ("does not provide an export named 'buildPatternView'").

- [ ] **Step 3: Implement (append to `lib/patterns/match.ts`)**

```ts
import type { Catalog } from "./types"

export interface CatalogProblemView {
  name: string
  slug: string
  url: string
  difficulty: string
  status: "solved" | "not-solved"
  due: boolean
  struggling: boolean
  problemId: string | null
}

export interface PatternView {
  id: string
  name: string
  total: number
  solved: number
  due: number
  struggling: number
  problems: CatalogProblemView[]
}

export function buildPatternView(
  catalog: Catalog,
  problems: MatchableProblem[],
  now: Date
): PatternView[] {
  const { bySlug, byName } = buildProblemIndex(problems)

  return catalog.patterns.map((pat) => {
    let solved = 0
    let due = 0
    let struggling = 0

    const views: CatalogProblemView[] = pat.problems.map((cp) => {
      const match = bySlug.get(cp.slug) ?? byName.get(normalizeName(cp.name)) ?? null
      if (!match) {
        return { ...cp, status: "not-solved", due: false, struggling: false, problemId: null }
      }
      const isDue = match.nextReviewDate != null && match.nextReviewDate <= now
      const isStruggling = match.lastRating === 1
      solved++
      if (isDue) due++
      if (isStruggling) struggling++
      return {
        ...cp,
        status: "solved",
        due: isDue,
        struggling: isStruggling,
        problemId: match.id,
      }
    })

    return { id: pat.id, name: pat.name, total: pat.problems.length, solved, due, struggling, problems: views }
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (all match.ts tests).

- [ ] **Step 5: Commit**

```bash
git add lib/patterns/match.ts lib/patterns/match.test.ts
git commit -m "feat: add pattern status overlay and per-pattern aggregation"
```

---

### Task 4: Schema flag + settings API

**Files:**
- Modify: `prisma/schema.prisma` (User model)
- Modify: `app/api/settings/route.ts`

**Interfaces:**
- Produces: `User.showPatterns: boolean`; GET `/api/settings` returns `showPatterns`; PATCH accepts `{ showPatterns: boolean }`.

- [ ] **Step 1: Add the field to `prisma/schema.prisma`**

In `model User`, after `fsrsTargetRetention`:

```prisma
  showPatterns     Boolean @default(false)
```

- [ ] **Step 2: Regenerate the Prisma client**

Run: `npx prisma generate`
Expected: success (Mongo needs no migration for an optional defaulted field).

- [ ] **Step 3: Add `showPatterns` to the GET select in `app/api/settings/route.ts`**

Change the GET `select` to include it:

```ts
      select: { dailyReviewLimit: true, leetcodeUsername: true, codeforcesHandle: true, fsrsTargetRetention: true, showPatterns: true },
```

- [ ] **Step 4: Handle `showPatterns` in the PATCH body**

In PATCH, extend the destructure and add a handler:

```ts
    const { dailyReviewLimit, leetcodeUsername, codeforcesHandle, fsrsTargetRetention, showPatterns } = body;
```

After the `fsrsTargetRetention` block, add:

```ts
    if (typeof showPatterns === 'boolean') {
        updateData.showPatterns = showPatterns;
    }
```

And add it to the PATCH response `select`:

```ts
      select: { dailyReviewLimit: true, leetcodeUsername: true, codeforcesHandle: true, showPatterns: true }
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma app/api/settings/route.ts
git commit -m "feat: add showPatterns user setting to schema and settings API"
```

---

### Task 5: Settings dialog toggle

**Files:**
- Modify: `components/SettingsDialog.tsx`

**Interfaces:**
- Consumes: GET/PATCH `/api/settings` `showPatterns` (Task 4).

- [ ] **Step 1: Add state**

Below `const [targetRetention, setTargetRetention] = useState(0.90);`:

```tsx
  const [showPatterns, setShowPatterns] = useState(false);
```

- [ ] **Step 2: Load it in the fetch effect**

In the `.then((data) => { ... })` block, add:

```tsx
          if (typeof data.showPatterns === 'boolean') setShowPatterns(data.showPatterns);
```

- [ ] **Step 3: Include it in the save body**

In `handleSave`, extend the PATCH body:

```tsx
        body: JSON.stringify({ dailyReviewLimit: Number(limit), leetcodeUsername: leetcodeUsername.trim(), fsrsTargetRetention: targetRetention, showPatterns }),
```

- [ ] **Step 4: Add a toggle row to the dialog body**

Immediately before the closing `</div>` of `<div className="space-y-6 p-6 overflow-y-auto">` (i.e. after the Platform Integrations block's closing `</div>`), insert:

```tsx
            <div className="w-full h-[1px] bg-gray-100 dark:bg-white/[0.06] my-4" />
            <div className="w-full px-6 flex items-center justify-between gap-4">
                <div>
                    <label className="text-[13px] font-semibold text-gray-700 dark:text-[#888] tracking-wide block">
                      Pattern Explorer
                    </label>
                    <p className="text-[12px] text-gray-500 dark:text-[#555] mt-1 max-w-[240px]">
                      Browse problems by technique with coverage and review health. Adds a Patterns page.
                    </p>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={showPatterns}
                    onClick={() => setShowPatterns((v) => !v)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${showPatterns ? 'bg-blue-600' : 'bg-gray-200 dark:bg-white/[0.1]'}`}
                >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${showPatterns ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
            </div>
```

- [ ] **Step 5: Verify build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Manual check**

Run `npm run dev`, open Settings, toggle Pattern Explorer on, Save. Reopen Settings → toggle reflects the saved state.

- [ ] **Step 7: Commit**

```bash
git add components/SettingsDialog.tsx
git commit -m "feat: add Pattern Explorer toggle to settings dialog"
```

---

### Task 6: Conditional navbar link

**Files:**
- Modify: `components/Navbar.tsx`

**Interfaces:**
- Consumes: GET `/api/settings` `showPatterns` (Task 4).

- [ ] **Step 1: Add imports + state**

Change the React import and add effect:

```tsx
import { useState, useEffect } from 'react';
```

Inside `Navbar`, after the `isMenuOpen` state:

```tsx
  const [showPatterns, setShowPatterns] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => setShowPatterns(!!data.showPatterns))
      .catch(() => {});
  }, [status]);
```

- [ ] **Step 2: Add the desktop link**

In the authenticated desktop block, inside the `<div className="flex items-center gap-1">`, after the Problems link:

```tsx
                {showPatterns && <Link href="/patterns" className={linkClass('/patterns')}>Patterns</Link>}
```

- [ ] **Step 3: Add the mobile link**

In the authenticated mobile block, after the Problems mobile link:

```tsx
              {showPatterns && <Link href="/patterns" onClick={toggleMenu} className={mobileLinkClass('/patterns')}>Patterns</Link>}
```

- [ ] **Step 4: Verify build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add components/Navbar.tsx
git commit -m "feat: show Patterns nav link when explorer is enabled"
```

---

### Task 7: Patterns page (server gate) + client view

**Files:**
- Create: `app/patterns/page.tsx`
- Create: `app/patterns/PatternsClient.tsx`

**Interfaces:**
- Consumes: `getCatalog` (Task 1), `buildPatternView` + `PatternView` (Task 3), `User.showPatterns` (Task 4), authOptions, prisma.

- [ ] **Step 1: Create the server component `app/patterns/page.tsx`**

```tsx
import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/authOptions"
import prisma from "@/lib/prisma"
import { getCatalog } from "@/lib/patterns"
import { buildPatternView } from "@/lib/patterns/match"
import PatternsClient from "./PatternsClient"

export default async function PatternsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { showPatterns: true },
  })
  if (!user?.showPatterns) redirect("/dashboard")

  const problems = await prisma.problem.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true, link: true, platform: true, nextReviewDate: true, lastRating: true },
  })

  const patterns = buildPatternView(getCatalog(), problems, new Date())
  return <PatternsClient patterns={patterns} />
}
```

- [ ] **Step 2: Create the client component `app/patterns/PatternsClient.tsx`**

```tsx
"use client"

import Link from "next/link"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { ExternalLink } from "lucide-react"
import type { PatternView } from "@/lib/patterns/match"

const DIFF_COLOR: Record<string, string> = {
  Easy: "text-emerald-600 dark:text-emerald-400",
  Medium: "text-amber-600 dark:text-amber-400",
  Hard: "text-rose-600 dark:text-rose-400",
}

export default function PatternsClient({ patterns }: { patterns: PatternView[] }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl italic mb-1 text-gray-900 dark:text-white [font-family:var(--font-playfair)]">
        Patterns
      </h1>
      <p className="text-[13px] text-gray-500 dark:text-[#666] mb-6">
        Coverage and review health by technique.
      </p>

      <Accordion type="multiple" className="space-y-2">
        {patterns.map((pat) => {
          const pct = pat.total ? Math.round((pat.solved / pat.total) * 100) : 0
          return (
            <AccordionItem
              key={pat.id}
              value={pat.id}
              className="border border-gray-200 dark:border-white/[0.08] rounded-[12px] px-4 bg-white dark:bg-white/[0.03]"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[14px] font-medium text-gray-900 dark:text-[rgba(255,255,255,0.9)] truncate">
                      {pat.name}
                    </span>
                    <span className="text-[12px] text-gray-500 dark:text-[#888] shrink-0 tabular-nums">
                      {pat.solved} / {pat.total}
                      {pat.due > 0 && <span className="ml-2 text-amber-600 dark:text-amber-400">· {pat.due} due</span>}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full bg-gray-900 dark:bg-white transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {pat.problems.map((p) => (
                    <li key={p.slug} className="flex items-center justify-between gap-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                            p.status === "not-solved"
                              ? "bg-gray-300 dark:bg-white/[0.15]"
                              : p.struggling
                              ? "bg-rose-500"
                              : p.due
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          title={
                            p.status === "not-solved"
                              ? "Not solved"
                              : p.struggling
                              ? "Struggling"
                              : p.due
                              ? "Due for review"
                              : "Solved"
                          }
                        />
                        {p.status === "solved" && p.problemId ? (
                          <Link
                            href={`/problems?selected=${p.problemId}`}
                            className="text-[13px] text-gray-900 dark:text-[rgba(255,255,255,0.85)] hover:underline truncate"
                          >
                            {p.name}
                          </Link>
                        ) : (
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[13px] text-gray-500 dark:text-[#888] hover:text-gray-900 dark:hover:text-white flex items-center gap-1 truncate"
                          >
                            {p.name}
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        )}
                      </div>
                      <span className={`text-[11px] font-medium shrink-0 ${DIFF_COLOR[p.difficulty] ?? ""}`}>
                        {p.difficulty}
                      </span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}
```

- [ ] **Step 3: Verify build compiles**

Run: `npm run build`
Expected: build succeeds; `/patterns` appears in the route list.

- [ ] **Step 4: Manual end-to-end check**

With `npm run dev` and the toggle ON: visit `/patterns` → accordions render, coverage bars reflect your solved LeetCode problems, a solved row links to `/problems?selected=<id>`, an unsolved row opens LeetCode. With the toggle OFF: visiting `/patterns` redirects to `/dashboard` and the nav link is hidden.

- [ ] **Step 5: Commit**

```bash
git add app/patterns/page.tsx app/patterns/PatternsClient.tsx
git commit -m "feat: add Pattern Explorer page with coverage and review health"
```

---

## Self-Review Notes

- **Spec coverage:** catalog pipeline (T1), matching+status+aggregation (T2/T3), schema flag (T4), settings toggle (T5), conditional nav (T6), gated page + UI (T7). Error handling — empty catalog throws in build script (T1) but `getCatalog` always returns committed data; `showPatterns` off → redirect (T7); non-LeetCode problems never slug-match (T2 test). Testing — pure functions TDD'd (T1–T3); UI verified via build + manual (no component test infra in repo).
- **Deferred (not in plan, per spec Non-Goals):** seanprashad source, prefilled `/add` deep-link, pattern-level review sessions, source dropdown.
- **Type consistency:** `MatchableProblem`, `PatternView`, `CatalogProblemView`, `buildPatternView`, `getCatalog` names are stable across tasks; the page's `prisma.problem.findMany` select matches `MatchableProblem` exactly.
