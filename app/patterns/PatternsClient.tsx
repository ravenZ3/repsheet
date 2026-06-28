"use client"

import Link from "next/link"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { ExternalLink } from "lucide-react"
import type { PatternView } from "@/lib/patterns/match"

const DIFF_COLOR: Record<string, string> = {
  Easy: "text-emerald-600 dark:text-emerald-400",
  Medium: "text-amber-600 dark:text-amber-400",
  Hard: "text-rose-600 dark:text-rose-400",
}

export default function PatternsClient({ patterns }: { patterns: PatternView[] }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl italic mb-1 text-gray-900 dark:text-white [font-family:var(--font-playfair)]">
        Patterns
      </h1>
      <p className="text-[13px] text-gray-500 dark:text-[#666] mb-6">
        Coverage and review health by technique.
      </p>

      <Accordion type="multiple" className="space-y-2">
        {patterns.map((pat) => {
          const pct = pat.total ? Math.round((pat.solved / pat.total) * 100) : 0
          return (
            <AccordionItem
              key={pat.id}
              value={pat.id}
              className="border border-gray-200 dark:border-white/[0.08] rounded-[12px] px-4 bg-white dark:bg-white/[0.03]"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[14px] font-medium text-gray-900 dark:text-[rgba(255,255,255,0.9)] truncate">
                      {pat.name}
                    </span>
                    <span className="text-[12px] text-gray-500 dark:text-[#888] shrink-0 tabular-nums">
                      {pat.solved} / {pat.total}
                      {pat.due > 0 && <span className="ml-2 text-amber-600 dark:text-amber-400">· {pat.due} due</span>}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full bg-gray-900 dark:bg-white transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {pat.problems.map((p) => (
                    <li key={p.slug} className="flex items-center justify-between gap-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                            p.status === "not-solved"
                              ? "bg-gray-300 dark:bg-white/[0.15]"
                              : p.struggling
                              ? "bg-rose-500"
                              : p.due
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          title={
                            p.status === "not-solved"
                              ? "Not solved"
                              : p.struggling
                              ? "Struggling"
                              : p.due
                              ? "Due for review"
                              : "Solved"
                          }
                        />
                        {p.status === "solved" && p.problemId ? (
                          <Link
                            href={`/problems?selected=${p.problemId}`}
                            className="text-[13px] text-gray-900 dark:text-[rgba(255,255,255,0.85)] hover:underline truncate"
                          >
                            {p.name}
                          </Link>
                        ) : (
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[13px] text-gray-500 dark:text-[#888] hover:text-gray-900 dark:hover:text-white flex items-center gap-1 truncate"
                          >
                            {p.name}
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        )}
                      </div>
                      <span className={`text-[11px] font-medium shrink-0 ${DIFF_COLOR[p.difficulty] ?? ""}`}>
                        {p.difficulty}
                      </span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}
