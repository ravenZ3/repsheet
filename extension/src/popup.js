// Popup: shows the due/reviewed summary and recent activity, or a sign-in
// prompt when the user has no active website session. All API access goes
// through the background worker.
const RS = globalThis.browser || globalThis.chrome;
const BASE_URL = "https://repsheet.vercel.app";

const RATING_LABELS = { 1: "Again", 2: "Hard", 3: "Good", 4: "Easy" };

function show(id) {
  for (const el of document.querySelectorAll("#loading, #signedout, #content")) {
    el.classList.add("hidden");
  }
  document.getElementById(id).classList.remove("hidden");
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
  show("content");
}

document.getElementById("open").addEventListener("click", () => {
  RS.tabs.create({ url: BASE_URL + "/dashboard" });
});
document.getElementById("review").addEventListener("click", () => {
  RS.tabs.create({ url: BASE_URL + "/review" });
});
document.getElementById("signin").addEventListener("click", async () => {
  await RS.runtime.sendMessage({ type: "signin" });
});

load();
