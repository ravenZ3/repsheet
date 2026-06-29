// Shared definition of the focus-tag format used by Focused Practice Mode.
// A focus tag is persisted on the User as a kind-prefixed string, e.g.
// "pattern:two-pointers" or "skill:dp", so both the settings route and the
// review page agree on how to parse and validate them.

export type FocusKind = "pattern" | "skill";

export interface FocusTag {
  kind: FocusKind;
  value: string;
}

const KINDS: readonly FocusKind[] = ["pattern", "skill"];

/** Parse a stored string into a FocusTag, or null if malformed. */
export function parseFocusTag(raw: string): FocusTag | null {
  if (typeof raw !== "string") return null;
  const idx = raw.indexOf(":");
  if (idx <= 0) return null;
  const kind = raw.slice(0, idx);
  const value = raw.slice(idx + 1);
  if (!KINDS.includes(kind as FocusKind)) return null;
  if (value.length === 0) return null;
  return { kind: kind as FocusKind, value };
}

/** Serialize a FocusTag back to its stored string form. */
export function formatFocusTag(tag: FocusTag): string {
  return `${tag.kind}:${tag.value}`;
}

/** Whether a stored string is a well-formed focus tag. */
export function isValidFocusTag(raw: string): boolean {
  return parseFocusTag(raw) !== null;
}

/** Parse an array of stored strings, dropping invalid ones and de-duplicating. */
export function parseFocusTags(raw: string[]): FocusTag[] {
  const seen = new Set<string>();
  const out: FocusTag[] = [];
  for (const entry of raw ?? []) {
    const tag = parseFocusTag(entry);
    if (!tag) continue;
    const key = formatFocusTag(tag);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}
