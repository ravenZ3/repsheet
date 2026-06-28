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
