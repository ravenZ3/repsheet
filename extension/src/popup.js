// Popup: shows the due/reviewed summary and a scrollable list of the problems
// in the current queue (the active focus's queue when focused, otherwise the
// due-today problems). Each row links straight to the problem so the website
// can be skipped. The last summary is cached so the list paints instantly while
// a fresh one loads. All API access goes through the background worker.
const RS = globalThis.browser || globalThis.chrome;
const BASE_URL = "https://repsheet.vercel.app";
const CACHE_KEY = "rs_summary";

function show(id) {
  for (const el of document.querySelectorAll("#loading, #signedout, #content")) {
    el.classList.add("hidden");
  }
  document.getElementById(id).classList.remove("hidden");
}

function focusHref(focus) {
  return focus.kind === "pattern"
    ? `${BASE_URL}/review?pattern=${encodeURIComponent(focus.value)}`
    : `${BASE_URL}/review?topic=${encodeURIComponent(focus.value)}`;
}

// Recall (0..1) → a coarse tier used for the badge color.
function recallTier(recall) {
  if (recall < 0.5) return "low";
  if (recall < 0.8) return "mid";
  return "high";
}

function renderProblemList(problems, activeFocus) {
  const wrap = document.getElementById("problemList");
  wrap.innerHTML = "";
  if (!problems || problems.length === 0) {
    const hint = document.createElement("p");
    hint.className = "muted list-empty";
    hint.textContent = activeFocus
      ? "All caught up in this focus 🎉"
      : "Nothing in the queue right now.";
    wrap.appendChild(hint);
    return;
  }
  for (const p of problems) {
    const row = document.createElement("button");
    row.className = "prow";
    row.title = `Open ${p.name}`;

    const name = document.createElement("span");
    name.className = "prow-name";
    name.textContent = p.name;

    const recall = document.createElement("span");
    recall.className = `prow-recall ${recallTier(p.recall)}`;
    recall.textContent = `${Math.round(p.recall * 100)}%`;

    row.append(name, recall);
    row.addEventListener("click", () =>
      RS.tabs.create({ url: p.url || BASE_URL + "/review" })
    );
    wrap.appendChild(row);
  }
}

// The "pick next" list — compact text links, shown only in focus mode when
// there are still catalog problems left to attempt.
function renderUnsolved(unsolved, activeFocus) {
  const section = document.getElementById("unsolvedSection");
  const wrap = document.getElementById("unsolvedList");
  wrap.innerHTML = "";
  if (!activeFocus || !unsolved || unsolved.length === 0) {
    section.classList.add("hidden");
    return;
  }
  for (const p of unsolved) {
    const row = document.createElement("button");
    row.className = "lrow";
    row.title = `Open ${p.name}`;

    const name = document.createElement("span");
    name.className = "lrow-name";
    name.textContent = p.name;

    const diff = document.createElement("span");
    diff.className = `lrow-diff ${(p.difficulty || "").toLowerCase()}`;
    diff.textContent = p.difficulty || "";

    row.append(name, diff);
    row.addEventListener("click", () =>
      RS.tabs.create({ url: p.url || BASE_URL + "/review" })
    );
    wrap.appendChild(row);
  }
  section.classList.remove("hidden");
}

function renderFooter(activeFocus) {
  const footer = document.getElementById("focusFooter");
  footer.textContent = activeFocus ? `Focus: ${activeFocus.label}` : "Due today";
}

function applyReviewButton(activeFocus) {
  const reviewBtn = document.getElementById("review");
  if (activeFocus) {
    reviewBtn.textContent = "Open focus";
    reviewBtn.onclick = () => RS.tabs.create({ url: focusHref(activeFocus) });
  } else {
    reviewBtn.textContent = "Go to review";
    reviewBtn.onclick = () => RS.tabs.create({ url: BASE_URL + "/review" });
  }
}

function applySummary(summary) {
  document.getElementById("due").textContent = summary.dueToday ?? 0;
  document.getElementById("reviewed").textContent = summary.reviewedToday ?? 0;
  document.getElementById("backlog").textContent = summary.backlog ?? 0;
  renderProblemList(summary.problems, summary.activeFocus);
  renderUnsolved(summary.unsolved, summary.activeFocus);
  renderFooter(summary.activeFocus);
  applyReviewButton(summary.activeFocus);
}

async function readCache() {
  try {
    const stored = await RS.storage.local.get(CACHE_KEY);
    return stored && stored[CACHE_KEY] ? stored[CACHE_KEY] : null;
  } catch (e) {
    return null;
  }
}

function writeCache(summary) {
  try {
    RS.storage.local.set({ [CACHE_KEY]: summary });
  } catch (e) {
    /* best-effort */
  }
}

// Fetches a fresh summary, repaints, and updates the cache.
async function refresh() {
  const summary = await RS.runtime.sendMessage({ type: "summary" });
  if (!summary || summary.error === "Unauthorized" || !summary.success) {
    show("signedout");
    return;
  }
  applySummary(summary);
  writeCache(summary);
  show("content");
}

// Paint the cached list immediately (if any), then refresh in the background.
async function init() {
  const cached = await readCache();
  if (cached) {
    applySummary(cached);
    show("content");
  }
  await refresh();
}

document.getElementById("open").addEventListener("click", () => {
  RS.tabs.create({ url: BASE_URL + "/dashboard" });
});
document.getElementById("signin").addEventListener("click", async () => {
  await RS.runtime.sendMessage({ type: "signin" });
});

const refreshBtn = document.getElementById("refresh");
refreshBtn.addEventListener("click", async () => {
  refreshBtn.classList.add("spin");
  await refresh();
  // Also nudge the badge to recompute against the latest state.
  RS.runtime.sendMessage({ type: "refreshBadge" });
  setTimeout(() => refreshBtn.classList.remove("spin"), 600);
});

init();
