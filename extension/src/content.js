// Content script entry point. Picks the adapter for the current site, watches
// for an "Accepted" verdict, and on detection scrapes the problem and shows the
// rating overlay. The actual API call is delegated to the background worker
// (only it can read the httpOnly session cookie).
(function () {
  const url = location.href;
  const adapters = globalThis.RS_ADAPTERS || [];
  const adapter = adapters.find((a) => a.matches(url));
  if (!adapter) return;

  async function handleAccepted() {
    let problem;
    try {
      problem = adapter.scrapeProblem();
    } catch (e) {
      console.warn("[Repsheet] scrape failed", e);
      return;
    }
    if (!problem || !problem.name || !problem.link) return;

    // Async pre-check: if this problem was just captured, don't prompt for a
    // rating again — show a passive "already logged" card instead. Keeps the
    // user from re-rating the same solve (the server also guards this).
    try {
      const status = await globalThis.RS.runtime.sendMessage({
        type: "captureStatus",
        link: problem.link,
      });
      if (status && status.recentlyCaptured) {
        globalThis.RS_Overlay.showLogged(problem);
        return;
      }
    } catch (e) {
      // If the check fails, fall through to the normal prompt.
    }

    globalThis.RS_Overlay.show(problem, async (rating) => {
      const response = await globalThis.RS.runtime.sendMessage({
        type: "capture",
        payload: { ...problem, rating },
      });
      if (response && response.error === "Unauthorized") {
        const err = new Error("Unauthorized");
        throw err;
      }
      return response;
    });
  }

  adapter.watchVerdict(handleAccepted);
  console.debug(`[Repsheet] adapter active: ${adapter.name}`);
})();
