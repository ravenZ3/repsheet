/**
 * Minimal in-memory sliding-window rate limiter for the credentials endpoints
 * (signup, login). bcrypt makes each attempt CPU-expensive, so unthrottled
 * requests are a cheap DoS / enumeration vector.
 *
 * In-memory means per-instance: on serverless this is best-effort, not a hard
 * guarantee — but Fluid Compute reuses instances, so it catches the common
 * case without external infrastructure.
 */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

// Cap the map so a rotating-key attacker can't grow it unboundedly.
const MAX_KEYS = 10_000;

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets — for a Retry-After header. */
  retryAfterSeconds: number;
}

/**
 * Returns whether the caller identified by `key` (e.g. "signup:<ip>") is under
 * `limit` hits per `windowMs`. Counts the current hit.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const w = windows.get(key);

  if (!w || now >= w.resetAt) {
    if (windows.size >= MAX_KEYS) {
      // Drop expired windows; if none expired, reset entirely (fail open).
      for (const [k, v] of windows) {
        if (now >= v.resetAt) windows.delete(k);
      }
      if (windows.size >= MAX_KEYS) windows.clear();
    }
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  w.count++;
  if (w.count > limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((w.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfterSeconds: 0 };
}

/** Best-effort client IP for rate-limit keys (Vercel sets x-forwarded-for). */
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
