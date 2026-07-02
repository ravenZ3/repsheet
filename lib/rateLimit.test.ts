import { describe, it, expect, vi, afterEach } from "vitest";
import { rateLimit, clientIp } from "./rateLimit";

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit", () => {
  it("allows up to the limit within a window", () => {
    const key = `t1:${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, 5, 60_000).ok).toBe(true);
    }
    const blocked = rateLimit(key, 5, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets after the window elapses", () => {
    vi.useFakeTimers();
    const key = `t2:${Math.random()}`;
    for (let i = 0; i < 3; i++) rateLimit(key, 3, 1_000);
    expect(rateLimit(key, 3, 1_000).ok).toBe(false);
    vi.advanceTimersByTime(1_001);
    expect(rateLimit(key, 3, 1_000).ok).toBe(true);
  });

  it("tracks keys independently", () => {
    const a = `t3a:${Math.random()}`;
    const b = `t3b:${Math.random()}`;
    expect(rateLimit(a, 1, 60_000).ok).toBe(true);
    expect(rateLimit(a, 1, 60_000).ok).toBe(false);
    expect(rateLimit(b, 1, 60_000).ok).toBe(true);
  });
});

describe("clientIp", () => {
  it("takes the first x-forwarded-for entry", () => {
    const h = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(clientIp(h)).toBe("1.2.3.4");
  });

  it("falls back to 'unknown'", () => {
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
