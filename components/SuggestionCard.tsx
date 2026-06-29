"use client"

import { Link as LinkIcon, ArrowUpRight } from "lucide-react"

function difficultyStyle(difficulty: string) {
	switch (difficulty) {
		case "Easy":
			return "border-green-200 dark:border-emerald-500/20 dark:bg-emerald-500/[0.04] text-green-600 dark:text-emerald-400"
		case "Hard":
			return "border-red-500/40 dark:border-rose-500/20 dark:bg-rose-500/[0.04] text-red-500 dark:text-rose-400"
		default:
			return "border-yellow-200 dark:border-amber-500/20 dark:bg-amber-500/[0.04] text-yellow-600 dark:text-amber-400"
	}
}

/**
 * A not-yet-solved catalog suggestion, styled to match ProblemReviewCard's shell
 * but without FSRS stats or rating controls — it just links out to the problem.
 * The dashed border + "Not solved" tag distinguish it from rateable review cards.
 */
export default function SuggestionCard({
	name,
	url,
	difficulty,
}: {
	name: string
	url: string
	difficulty: string
}) {
	return (
		<li className="list-none">
			<a
				href={url}
				target="_blank"
				rel="noopener noreferrer"
				className="group rounded-[14px] p-3.5 flex items-center justify-between gap-4 bg-gray-50/60 dark:bg-white/[0.02] border border-dashed border-gray-200 dark:border-white/[0.08] shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-white/[0.15] dark:hover:bg-white/[0.05] transition-all"
			>
				<div className="flex items-center gap-2 min-w-0">
					<span className="font-medium tracking-tight text-[17px] text-gray-700 dark:text-[rgba(255,255,255,0.8)] truncate">
						{name}
					</span>
					<LinkIcon className="w-3.5 h-3.5 text-gray-400 dark:text-[#888] shrink-0" strokeWidth={2} />
				</div>

				<div className="flex items-center gap-2.5 shrink-0">
					<span className="px-2.5 py-0.5 border rounded-full text-[11px] font-medium tracking-wide border-gray-200 dark:border-white/[0.08] text-gray-400 dark:text-[#777]">
						Not solved
					</span>
					<span className={`px-2.5 py-0.5 border rounded-full text-[11px] font-medium tracking-wide ${difficultyStyle(difficulty)}`}>
						{difficulty}
					</span>
					<ArrowUpRight className="w-4 h-4 text-gray-400 dark:text-[#666] group-hover:text-gray-600 dark:group-hover:text-white transition-colors" strokeWidth={2} />
				</div>
			</a>
		</li>
	)
}
