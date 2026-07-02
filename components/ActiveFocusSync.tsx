"use client"

import { useEffect } from "react"

/**
 * Persists the review page's current focus (pattern/skill tag, or null for the
 * global queue) so the extension badge can mirror it.
 *
 * This runs as a client effect — i.e. only on a real visit — rather than as a
 * write during the server component's render, where <Link> prefetching would
 * fire it without the user ever opening the page (and every render would block
 * on a DB write).
 */
export default function ActiveFocusSync({ activeFocus }: { activeFocus: string | null }) {
  useEffect(() => {
    fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeFocus }),
    }).catch(() => {
      // Best-effort mirror; the extension just shows the previous focus until
      // the next successful sync.
    })
  }, [activeFocus])

  return null
}
