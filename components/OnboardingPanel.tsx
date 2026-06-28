"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, ArrowRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { connectAndSync } from "@/lib/syncClient"

export default function OnboardingPanel() {
  const [leetcode, setLeetcode] = useState("")
  const [codeforces, setCodeforces] = useState("")
  const [syncing, setSyncing] = useState(false)

  const canSync = !!(leetcode.trim() || codeforces.trim()) && !syncing

  const handleSync = async () => {
    setSyncing(true)
    try {
      const { synced, skipped } = await connectAndSync({
        leetcodeUsername: leetcode,
        codeforcesHandle: codeforces,
      })
      toast.success(`Synced ${synced} problems. ${skipped} skipped.`)
      setTimeout(() => window.location.reload(), 1200)
    } catch (e) {
      toast.error((e as Error).message || "Sync failed")
      setSyncing(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto mt-10 px-4">
      <div className="rounded-[16px] border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] shadow-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent mix-blend-overlay pointer-events-none" />

        <h1 className="text-2xl italic text-gray-900 dark:text-white [font-family:var(--font-playfair)]">
          Welcome to RepSheet
        </h1>
        <p className="text-[13px] text-gray-500 dark:text-[#888] mt-2 mb-6">
          Connect your LeetCode or Codeforces to pull in everything you&apos;ve already
          solved. We&apos;ll schedule reviews so you stop forgetting them.
        </p>

        <div className="flex flex-col gap-3 max-w-sm">
          <Input
            placeholder="LeetCode handle"
            value={leetcode}
            onChange={(e) => setLeetcode(e.target.value)}
            disabled={syncing}
            className="bg-gray-50 dark:bg-white/[0.03] border-[#ffa116]/20 text-sm h-9"
          />
          <Input
            placeholder="Codeforces handle"
            value={codeforces}
            onChange={(e) => setCodeforces(e.target.value)}
            disabled={syncing}
            className="bg-gray-50 dark:bg-white/[0.03] border-[#318ce7]/20 text-sm h-9"
          />
          <Button
            onClick={handleSync}
            disabled={!canSync}
            className="w-full bg-[#10b981] hover:bg-[#059669] text-white shadow-sm h-9 text-[13px] mt-1"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Connect & Sync"}
          </Button>
        </div>

        <Link
          href="/add"
          className="inline-flex items-center gap-1 text-[12px] text-gray-500 dark:text-[#666] hover:text-gray-900 dark:hover:text-white mt-5 transition-colors"
        >
          or add your first problem manually
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  )
}
