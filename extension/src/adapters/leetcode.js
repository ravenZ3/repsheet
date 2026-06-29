// LeetCode adapter.
//
// SELECTOR CONTRACT — all fragile DOM knowledge for LeetCode lives here.
// If LeetCode redesigns, only this file should need patching. Each function
// is defensive: it returns best-effort data and never throws.
(function () {
  const SELECTORS = {
    // Element LeetCode renders with the submission verdict text.
    verdict: '[data-e2e-locator="submission-result"]',
    // Topic tag links.
    tags: 'a[href^="/tag/"]',
  };

  function problemSlug() {
    const m = location.pathname.match(/\/problems\/([^/]+)/);
    return m ? m[1] : null;
  }

  function scrapeName() {
    // document.title is the most stable source: "Two Sum - LeetCode".
    const t = document.title.replace(/\s*-\s*LeetCode.*$/i, "").trim();
    if (t) return t;
    const slug = problemSlug();
    return slug ? slug.replace(/-/g, " ") : "Unknown problem";
  }

  function scrapeDifficulty() {
    // LeetCode shows a badge whose text is exactly Easy/Medium/Hard.
    const els = document.querySelectorAll("div, span, a");
    for (const el of els) {
      const txt = (el.textContent || "").trim();
      if ((txt === "Easy" || txt === "Medium" || txt === "Hard") && el.children.length === 0) {
        return txt;
      }
    }
    return undefined;
  }

  function scrapeTags() {
    return Array.from(document.querySelectorAll(SELECTORS.tags))
      .map((a) => (a.textContent || "").trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  function canonicalUrl() {
    const slug = problemSlug();
    return slug ? `${location.origin}/problems/${slug}/` : location.origin + location.pathname;
  }

  globalThis.RS_ADAPTERS = globalThis.RS_ADAPTERS || [];
  globalThis.RS_ADAPTERS.push({
    name: "LeetCode",
    // Anchor on /, . or start so bare leetcode.com and www.leetcode.com both
    // match, but lookalikes like notleetcode.com do not.
    matches: (url) => /(^|\/|\.)leetcode\.com\/problems\//.test(url),

    scrapeProblem() {
      return {
        name: scrapeName(),
        platform: "LeetCode",
        link: canonicalUrl(),
        difficulty: scrapeDifficulty(),
        tags: scrapeTags(),
      };
    },

    // Calls onAccepted() once each time an "Accepted" verdict appears. The
    // verdict element lingers in the DOM and the page mutates constantly, so we
    // fire on the transition into "accepted" and only re-arm once it clears —
    // otherwise the same solve would fire repeatedly.
    watchVerdict(onAccepted) {
      let handled = false;
      const check = () => {
        const el = document.querySelector(SELECTORS.verdict);
        const accepted = !!(el && /accepted/i.test(el.textContent || ""));
        if (accepted && !handled) {
          handled = true;
          onAccepted();
        } else if (!accepted) {
          handled = false;
        }
      };
      const observer = new MutationObserver(check);
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      check();
      return () => observer.disconnect();
    },
  });
})();
