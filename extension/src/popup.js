// Popup: shows the due/reviewed summary and recent activity, mirrors the
// website's active focus when one is set, or a sign-in prompt when there's no
// session. All API access goes through the background worker.
const RS = globalThis.browser || globalThis.chrome;
const BASE_URL = "https://repsheet.vercel.app";

const RATING_LABELS = { 1: "Again", 2: "Hard", 3: "Good", 4: "Easy" };

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

function renderRecent(recent) {
  const ul = document.getElementById("recent");
  ul.innerHTML = "";
  if (!recent || recent.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No reviews yet.";
    ul.appendChild(li);
    return;
  }
  for (const r of recent) {
    const li = document.createElement("li");
    const nm = document.createElement("span");
    nm.className = "nm";
    nm.textContent = r.name;
    const rt = document.createElement("span");
    rt.className = "rt";
    rt.textContent = RATING_LABELS[r.rating] || "";
    li.appendChild(nm);
    li.appendChild(rt);
    ul.appendChild(li);
  }
}

function applyFocus(focus) {
  const banner = document.getElementById("focusBanner");
  const dueLabel = document.getElementById("dueLabel");
  const due = document.getElementById("due");
  const reviewBtn = document.getElementById("review");

  if (focus) {
    document.getElementById("focusName").textContent = focus.label;
    document.getElementById("openFocus").onclick = () => RS.tabs.create({ url: focusHref(focus) });
    banner.classList.remove("hidden");
    dueLabel.textContent = "In focus";
    due.textContent = focus.count ?? 0;
    reviewBtn.textContent = "Open focus";
    reviewBtn.onclick = () => RS.tabs.create({ url: focusHref(focus) });
  } else {
    banner.classList.add("hidden");
    dueLabel.textContent = "Due today";
    reviewBtn.textContent = "Go to review";
    reviewBtn.onclick = () => RS.tabs.create({ url: BASE_URL + "/review" });
  }
}

async function load() {
  const summary = await RS.runtime.sendMessage({ type: "summary" });
  if (!summary || summary.error === "Unauthorized" || !summary.success) {
    show("signedout");
    return;
  }
  document.getElementById("due").textContent = summary.dueToday ?? 0;
  document.getElementById("reviewed").textContent = summary.reviewedToday ?? 0;
  document.getElementById("backlog").textContent = summary.backlog ?? 0;
  renderRecent(summary.recent);
  applyFocus(summary.activeFocus);
  show("content");
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
  show("loading");
  await load();
  // Also nudge the badge to recompute against the latest state.
  RS.runtime.sendMessage({ type: "refreshBadge" });
  setTimeout(() => refreshBtn.classList.remove("spin"), 600);
});

load();
