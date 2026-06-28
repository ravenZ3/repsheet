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
