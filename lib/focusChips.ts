import { parseFocusTags } from "@/lib/focusTags";
import { getCatalog } from "@/lib/patterns";

export interface FocusChip {
  label: string;
  kind: "pattern" | "skill";
  href: string;
}

/**
 * Resolves stored focus tags into renderable chips: a display label and the
 * review-page href that launches that focus session. Pattern labels are looked
 * up from the catalog; skill labels are the tag value itself.
 */
export function resolveFocusChips(focusTags: string[]): FocusChip[] {
  const patternNames = new Map(getCatalog().patterns.map((p) => [p.id, p.name]));
  return parseFocusTags(focusTags).map((tag) => {
    if (tag.kind === "pattern") {
      return {
        label: patternNames.get(tag.value) ?? tag.value,
        kind: "pattern",
        href: `/review?pattern=${encodeURIComponent(tag.value)}`,
      };
    }
    return {
      label: tag.value,
      kind: "skill",
      href: `/review?topic=${encodeURIComponent(tag.value)}`,
    };
  });
}
