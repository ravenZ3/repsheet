import type { Catalog } from "./types"

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

export interface PatternBuckets {
  due: CatalogProblemView[]
  inProgress: CatalogProblemView[]
  notSolved: CatalogProblemView[]
}

/**
 * Splits a pattern's problems into the three buckets the focused practice view
 * renders: solved-and-due (review now), solved-but-not-due (in progress), and
 * not-yet-solved (suggestions).
 */
export function splitPatternProblems(pattern: PatternView): PatternBuckets {
  const due: CatalogProblemView[] = []
  const inProgress: CatalogProblemView[] = []
  const notSolved: CatalogProblemView[] = []
  for (const p of pattern.problems) {
    if (p.status === "not-solved") notSolved.push(p)
    else if (p.due) due.push(p)
    else inProgress.push(p)
  }
  return { due, inProgress, notSolved }
}
