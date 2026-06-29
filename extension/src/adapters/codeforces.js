// Codeforces adapter.
//
// SELECTOR CONTRACT — all fragile DOM knowledge for Codeforces lives here.
//
// NOTE (known risk, see design doc): Codeforces shows the final verdict on the
// submissions table, which may be a separate page from the problem statement.
// We detect an "Accepted"/"Pretests passed" verdict anywhere it renders
// (`.verdict-accepted`), and scrape full metadata only when the problem
// statement is present on the page; otherwise we send name+link and let the
// server default difficulty (sync backfills the rest).
(function () {
  const SELECTORS = {
    accepted: ".verdict-accepted",
    title: ".problem-statement .title, .header .title",
    tagBox: ".tag-box",
  };

  function canonicalUrl() {
    return location.origin + location.pathname.replace(/\/$/, "");
  }

  function hasStatement() {
    return !!document.querySelector(".problem-statement");
  }

  function scrapeName() {
    const el = document.querySelector(SELECTORS.title);
    const t = el ? (el.textContent || "").trim() : "";
    if (t) return t;
    // Fallback to the page title, e.g. "Problem - A - Codeforces".
    return document.title.replace(/\s*-\s*Codeforces.*$/i, "").trim() || "Unknown problem";
  }

  function scrapeRatingAndTags() {
    const boxes = Array.from(document.querySelectorAll(SELECTORS.tagBox));
    let rating = null;
    const tags = [];
    for (const b of boxes) {
      const txt = (b.textContent || "").trim();
      const m = txt.match(/^\*?(\d{3,4})$/); // e.g. "*1500"
      if (m) {
        rating = parseInt(m[1], 10);
      } else if (txt) {
        tags.push(txt);
      }
    }
    return { rating, tags: tags.slice(0, 12) };
  }

  globalThis.RS_ADAPTERS = globalThis.RS_ADAPTERS || [];
  globalThis.RS_ADAPTERS.push({
    name: "Codeforces",
    // Anchor on /, . or start so bare and www codeforces.com both match.
    matches: (url) => /(^|\/|\.)codeforces\.com\//.test(url),

    scrapeProblem() {
      const { rating, tags } = hasStatement() ? scrapeRatingAndTags() : { rating: null, tags: [] };
      return {
        name: scrapeName(),
        platform: "Codeforces",
        link: canonicalUrl(),
        // Difficulty is derived server-side from platformRating for Codeforces.
        difficulty: undefined,
        platformRating: rating ?? undefined,
        tags,
      };
    },

    // Fire on the transition into an accepted verdict, re-arming only once it
    // clears, so a lingering verdict element doesn't refire for the same solve.
    watchVerdict(onAccepted) {
      let handled = false;
      const check = () => {
        const accepted = !!document.querySelector(SELECTORS.accepted);
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
