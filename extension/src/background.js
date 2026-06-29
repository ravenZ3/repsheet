// Background worker. Self-contained (no imports) so it runs both as a Chrome
// MV3 service worker and a Firefox event page. Owns all authenticated API calls
// because only the background context can read the httpOnly session cookie.

const RS = globalThis.browser || globalThis.chrome;

const CONFIG = {
  BASE_URL: "https://repsheet.vercel.app",
  SESSION_COOKIE_NAMES: ["__Secure-next-auth.session-token", "next-auth.session-token"],
  SESSION_HEADER: "x-repsheet-session",
  BADGE_REFRESH_MINUTES: 30,
};

// --- Auth ---------------------------------------------------------------

// Reads the NextAuth session JWT from the Repsheet cookie jar. Returns the raw
// token string, or null if the user isn't logged in on the website.
async function getSessionToken() {
  // DIAGNOSTIC: list every cookie the extension can see for the Repsheet domain.
  try {
    const all = await RS.cookies.getAll({ url: CONFIG.BASE_URL });
    console.log("[Repsheet] cookies visible for", CONFIG.BASE_URL, ":",
      all.map((c) => c.name));
  } catch (e) {
    console.error("[Repsheet] cookies.getAll failed:", e);
  }

  for (const name of CONFIG.SESSION_COOKIE_NAMES) {
    try {
      const cookie = await RS.cookies.get({ url: CONFIG.BASE_URL, name });
      if (cookie && cookie.value) {
        console.log("[Repsheet] found session cookie:", name);
        return cookie.value;
      }
    } catch (e) {
      console.error("[Repsheet] cookies.get failed for", name, e);
    }
  }
  console.warn("[Repsheet] no session cookie matched", CONFIG.SESSION_COOKIE_NAMES);
  return null;
}

async function apiFetch(path, options = {}) {
  const token = await getSessionToken();
  if (!token) return { ok: false, status: 401, body: { error: "Unauthorized" } };

  const res = await fetch(CONFIG.BASE_URL + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      [CONFIG.SESSION_HEADER]: token,
      ...(options.headers || {}),
    },
  });

  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    body = null;
  }
  console.log("[Repsheet] API", path, "→", res.status, body);
  return { ok: res.ok, status: res.status, body };
}

// --- Actions ------------------------------------------------------------

async function capture(payload) {
  const { ok, status, body } = await apiFetch("/api/extension/capture", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (status === 401) return { error: "Unauthorized" };
  if (ok) {
    refreshBadge();
    return body;
  }
  return { success: false, message: (body && body.message) || "Capture failed" };
}

async function getSummary() {
  const { status, body } = await apiFetch("/api/extension/summary");
  if (status === 401) return { error: "Unauthorized" };
  return body || { success: false };
}

async function refreshBadge() {
  try {
    const summary = await getSummary();
    if (summary && summary.success) {
      // Mirror the website's focus: badge shows the active focus count when
      // focused, otherwise the global due-today count.
      const n = summary.activeFocus ? (summary.activeFocus.count || 0) : (summary.dueToday || 0);
      await RS.action.setBadgeText({ text: n > 0 ? String(n) : "" });
      await RS.action.setBadgeBackgroundColor({ color: summary.activeFocus ? "#7c3aed" : "#a855f7" });
    } else {
      await RS.action.setBadgeText({ text: "" });
    }
  } catch (e) {
    // best-effort badge; ignore failures
  }
}

function openSignIn() {
  return RS.tabs.create({ url: CONFIG.BASE_URL + "/login" });
}

// --- Wiring -------------------------------------------------------------

RS.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message && message.type) {
      case "capture":
        sendResponse(await capture(message.payload));
        break;
      case "summary":
        sendResponse(await getSummary());
        break;
      case "signin":
        await openSignIn();
        sendResponse({ success: true });
        break;
      case "refreshBadge":
        await refreshBadge();
        sendResponse({ success: true });
        break;
      default:
        sendResponse({ success: false, message: "Unknown message" });
    }
  })();
  return true; // keep the message channel open for the async response
});

RS.runtime.onInstalled.addListener(() => {
  RS.alarms.create("refreshBadge", { periodInMinutes: CONFIG.BADGE_REFRESH_MINUTES });
  refreshBadge();
});

RS.runtime.onStartup && RS.runtime.onStartup.addListener(refreshBadge);

RS.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "refreshBadge") refreshBadge();
});
