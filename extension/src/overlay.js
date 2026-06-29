// Floating FSRS rating overlay, injected on the problem page after an
// "Accepted" verdict. Rendered inside a Shadow DOM so the host site's CSS
// cannot affect it. Exposes globalThis.RS_Overlay.
(function () {
  const RATINGS = [
    { label: "Again", value: 1, color: "#ef4444" },
    { label: "Hard", value: 2, color: "#f97316" },
    { label: "Good", value: 3, color: "#22c55e" },
    { label: "Easy", value: 4, color: "#3b82f6" },
  ];

  const STYLE = `
    :host { all: initial; }
    .card {
      position: fixed; bottom: 20px; right: 20px; z-index: 2147483647;
      width: 300px; padding: 16px; border-radius: 14px;
      background: #111; color: #fff; box-shadow: 0 10px 40px rgba(0,0,0,.5);
      border: 1px solid rgba(255,255,255,.1);
      font-family: -apple-system, system-ui, sans-serif;
    }
    .head { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
    .brand { font-size:12px; font-weight:700; letter-spacing:.05em; color:#a855f7; text-transform:uppercase; }
    .close { cursor:pointer; color:#888; font-size:16px; line-height:1; background:none; border:none; }
    .name { font-size:13px; color:#ccc; margin-bottom:12px; line-height:1.3; word-break:break-word; }
    .btns { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; }
    .btn {
      cursor:pointer; border:none; border-radius:8px; padding:8px 4px;
      font-size:12px; font-weight:600; color:#fff; transition:opacity .15s;
    }
    .btn:hover { opacity:.85; }
    .btn:disabled { opacity:.4; cursor:default; }
    .status { margin-top:10px; font-size:12px; color:#22c55e; min-height:16px; }
    .status.err { color:#ef4444; }
  `;

  let hostEl = null;

  function remove() {
    if (hostEl) {
      hostEl.remove();
      hostEl = null;
    }
  }

  function show(problem, onRate) {
    remove();
    hostEl = document.createElement("div");
    const shadow = hostEl.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = STYLE;
    shadow.appendChild(style);

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="head">
        <span class="brand">Repsheet · Solved</span>
        <button class="close" title="Dismiss">✕</button>
      </div>
      <div class="name"></div>
      <div class="btns"></div>
      <div class="status"></div>
    `;
    card.querySelector(".name").textContent = problem.name;
    card.querySelector(".close").addEventListener("click", remove);

    const btns = card.querySelector(".btns");
    const status = card.querySelector(".status");

    RATINGS.forEach((r) => {
      const b = document.createElement("button");
      b.className = "btn";
      b.style.background = r.color;
      b.textContent = r.label;
      b.addEventListener("click", async () => {
        btns.querySelectorAll("button").forEach((x) => (x.disabled = true));
        status.className = "status";
        status.textContent = "Saving…";
        try {
          const result = await onRate(r.value);
          if (result && result.success) {
            status.textContent = result.deduped ? "✓ Already logged" : "✓ Scheduled";
            setTimeout(remove, 1500);
          } else {
            throw new Error((result && result.message) || "Failed");
          }
        } catch (e) {
          status.className = "status err";
          status.textContent = e && e.message === "Unauthorized"
            ? "Sign in on repsheet.vercel.app first"
            : "Couldn't save — try again";
          btns.querySelectorAll("button").forEach((x) => (x.disabled = false));
        }
      });
      btns.appendChild(b);
    });

    shadow.appendChild(card);
    document.body.appendChild(hostEl);
  }

  // Passive card shown when the problem was already captured recently — no
  // rating prompt, so the same solve can't be double-rated.
  function showLogged(problem) {
    remove();
    hostEl = document.createElement("div");
    const shadow = hostEl.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = STYLE;
    shadow.appendChild(style);

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="head">
        <span class="brand">Repsheet · Logged</span>
        <button class="close" title="Dismiss">✕</button>
      </div>
      <div class="name"></div>
      <div class="status">✓ Already logged — no need to rate again</div>
    `;
    card.querySelector(".name").textContent = problem.name;
    card.querySelector(".close").addEventListener("click", remove);

    shadow.appendChild(card);
    document.body.appendChild(hostEl);
    setTimeout(remove, 2500);
  }

  globalThis.RS_Overlay = { show, showLogged, remove };
})();
