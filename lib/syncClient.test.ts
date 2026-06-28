import { describe, it, expect, vi, beforeEach } from "vitest"
import { connectAndSync } from "./syncClient"

type Resp = { ok: boolean; json: () => Promise<unknown> }
const res = (ok: boolean, body: unknown): Resp => ({ ok, json: async () => body })

let calls: { url: string; method: string }[] = []

function mock(routes: Record<string, Resp>) {
  calls = []
  global.fetch = vi.fn(async (url: string, opts?: { method?: string }) => {
    calls.push({ url, method: opts?.method ?? "GET" })
    const r = routes[url]
    if (!r) throw new Error(`unexpected fetch: ${url}`)
    return r as unknown as Response
  }) as unknown as typeof fetch
}

beforeEach(() => { calls = [] })

describe("connectAndSync", () => {
  it("aggregates synced/skipped across both platforms", async () => {
    mock({
      "/api/settings": res(true, {}),
      "/api/sync/leetcode": res(true, { success: true, synced: 3, skipped: 1 }),
      "/api/sync/codeforces": res(true, { success: true, synced: 2, skipped: 0 }),
    })
    const out = await connectAndSync({ leetcodeUsername: "ravenZ3", codeforcesHandle: "ravenZ3" })
    expect(out).toEqual({ synced: 5, skipped: 1 })
  })

  it("skips a platform whose handle is absent (no POST to it)", async () => {
    mock({
      "/api/settings": res(true, {}),
      "/api/sync/leetcode": res(true, { success: true, synced: 1, skipped: 0 }),
    })
    await connectAndSync({ leetcodeUsername: "ravenZ3" })
    expect(calls.some((c) => c.url === "/api/sync/codeforces")).toBe(false)
    expect(calls.some((c) => c.url === "/api/sync/leetcode" && c.method === "POST")).toBe(true)
  })

  it("throws the server message when the settings PATCH fails", async () => {
    mock({ "/api/settings": res(false, { error: "Codeforces verification failed: Handle not found" }) })
    await expect(connectAndSync({ codeforcesHandle: "nope" })).rejects.toThrow("Codeforces verification failed: Handle not found")
  })

  it("throws when a sync response body contains an error", async () => {
    mock({
      "/api/settings": res(true, {}),
      "/api/sync/leetcode": res(true, { error: "Sync pipeline failed" }),
    })
    await expect(connectAndSync({ leetcodeUsername: "ravenZ3" })).rejects.toThrow("Sync pipeline failed")
  })
})
