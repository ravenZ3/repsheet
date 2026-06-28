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
