// Central config shared by content scripts, background, and popup.
// To point the extension at a local dev server, change BASE_URL to
// "http://localhost:3000" and add it to host_permissions in the manifest.
globalThis.RS_CONFIG = {
  BASE_URL: "https://repsheet.vercel.app",
  // NextAuth uses __Secure- prefix over HTTPS; the bare name is the dev fallback.
  SESSION_COOKIE_NAMES: ["__Secure-next-auth.session-token", "next-auth.session-token"],
  SESSION_HEADER: "x-repsheet-session",
  // Background badge refresh cadence (minutes).
  BADGE_REFRESH_MINUTES: 30,
};
