# Repsheet Browser Extension

Capture and FSRS-rate problems the moment you solve them on LeetCode / Codeforces,
plus a due-today badge and a mini-dashboard popup. Works in Chrome and Firefox.

No build step is required to develop — it's plain JS. The `build.mjs` script just
copies the right manifest per browser into `dist/`.

## How auth works

You sign in **once on the website** (`repsheet.vercel.app`). The extension's
background worker reads the NextAuth session cookie and relays it as an
`X-Repsheet-Session` header on its API calls — no separate login. If you're not
signed in, the popup offers a "Sign in" button that opens the website.

See `../docs/notes/2026-06-29-browser-extension-design.md` for the full design.

## Load it (development)

### Chrome / Edge / Brave
1. Run `node build.mjs` (or just point at `extension/` after copying
   `manifest.chrome.json` → `manifest.json`).
2. Go to `chrome://extensions`, enable **Developer mode**.
3. **Load unpacked** → select `extension/dist/chrome`.

### Firefox
1. Run `node build.mjs`.
2. Go to `about:debugging#/runtime/this-firefox`.
3. **Load Temporary Add-on** → select `extension/dist/firefox/manifest.json`.

## Point at a local backend

Edit `BASE_URL` in **both** `src/config.js` and `src/background.js` to
`http://localhost:3000`, and add `http://localhost:3000/*` to `host_permissions`
in the manifest(s). (Local NextAuth uses the non-`__Secure-` cookie name, which
is already in the cookie-name list.)

## File map

| File | Role |
|------|------|
| `src/background.js` | Auth (cookie→header), API calls, badge, alarms. Self-contained. |
| `src/content.js` | Picks an adapter, watches for "Accepted", shows the overlay. |
| `src/adapters/*.js` | **Selector contracts** — all fragile DOM logic per site. |
| `src/overlay.js` | The FSRS rating card (Shadow DOM). |
| `src/popup.*` | Toolbar mini-dashboard + sign-in state. |
| `src/config.js` | Shared config (base URL, cookie names). |

## Maintenance

When LeetCode or Codeforces change their markup, only the matching file in
`src/adapters/` should need editing — each exposes `matches`, `scrapeProblem`,
and `watchVerdict`.
