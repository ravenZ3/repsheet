export interface ConnectAndSyncInput {
  leetcodeUsername?: string
  codeforcesHandle?: string
}

export interface SyncResult {
  synced: number
  skipped: number
}

interface SyncResponse {
  synced?: number
  skipped?: number
  error?: string
}

export async function connectAndSync(input: ConnectAndSyncInput): Promise<SyncResult> {
  const lc = input.leetcodeUsername?.trim()
  const cf = input.codeforcesHandle?.trim()

  const patchBody: Record<string, string> = {}
  if (lc) patchBody.leetcodeUsername = lc
  if (cf) patchBody.codeforcesHandle = cf

  const settingsRes = await fetch("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patchBody),
  })
  if (!settingsRes.ok) {
    const err = (await settingsRes.json().catch(() => ({}))) as SyncResponse
    throw new Error(err.error || "Failed to save handles")
  }

  const results: SyncResponse[] = []
  if (lc) {
    const r = await fetch("/api/sync/leetcode", { method: "POST" })
    results.push((await r.json()) as SyncResponse)
  }
  if (cf) {
    const r = await fetch("/api/sync/codeforces", { method: "POST" })
    results.push((await r.json()) as SyncResponse)
  }

  const failed = results.find((r) => r.error)
  if (failed) throw new Error(failed.error)

  return {
    synced: results.reduce((n, r) => n + (r.synced || 0), 0),
    skipped: results.reduce((n, r) => n + (r.skipped || 0), 0),
  }
}
