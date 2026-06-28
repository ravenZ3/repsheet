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
