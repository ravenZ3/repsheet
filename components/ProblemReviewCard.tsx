"use client"
import React, { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle, Loader2, Calendar, Repeat, Link as LinkIcon } from "lucide-react"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Problem } from "@prisma/client"
import { Difficulty } from "@prisma/client"

interface ProblemReviewCardProps {
	problem: Problem
	onUpdate?: (id: string, updates: Partial<Problem> | null, isReview?: boolean) => void
    isSelected?: boolean
    isCompressed?: boolean
    onSelect?: () => void
}

export default React.memo(function ProblemReviewCard({ problem, onUpdate, isSelected, isCompressed, onSelect }: ProblemReviewCardProps) {
	const [rating, setRating] = useState<string>("")
	const [submitting, setSubmitting] = useState(false)
	const [isVisible, setIsVisible] = useState(true)

	const difficultyStyle = useMemo(() => {
		switch (problem.difficulty) {
			case Difficulty.Easy:
				return { color: "text-green-600 dark:text-emerald-400", bg: "border-green-200 dark:border-emerald-500/20 dark:bg-emerald-500/[0.04]" }
			case Difficulty.Medium:
				return { color: "text-yellow-600 dark:text-amber-400", bg: "border-yellow-200 dark:border-amber-500/20 dark:bg-amber-500/[0.04]" }
			case Difficulty.Hard:
				return { color: "text-red-500 dark:text-rose-400", bg: "border-red-500/40 dark:border-rose-500/20 dark:bg-rose-500/[0.04]" }
			default:
				return { color: "text-gray-600 dark:text-[#888]", bg: "border-gray-200 dark:border-white/10 dark:bg-white/[0.02]" }
		}
	}, [problem.difficulty])

	const handleReview = useCallback(async () => {
		if (!rating) {
			toast.error("Please select a difficulty rating to proceed.")
			return
		}
		setSubmitting(true)
		try {
			const response = await fetch("/review/mark", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: problem.id, rating: Number(rating) }),
			})
			if (!response.ok) throw new Error("Failed to mark review.")
			const updatedProblem = await response.json()
			toast.success(`"${problem.name}" reviewed!`)
			setIsVisible(false)
			onUpdate?.(problem.id, updatedProblem, true)
			setRating("")
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "An unknown error occurred.")
		} finally {
			setSubmitting(false)
		}
	}, [problem.id, problem.name, rating, onUpdate])

	const formatDate = (date: Date | null) => {
		if (!date) return "N/A"
		return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
	}

    const handleCardClick = (e: React.MouseEvent) => {
        // Prevent expanding panel if clicking on an interactive element
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('a') || target.closest('[role="combobox"]')) return;
        onSelect?.();
    }

	return (
		<AnimatePresence>
			{isVisible && (
				<motion.li
					initial={{ opacity: 0, y: 30, scale: 0.98 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					exit={{ opacity: 0, x: -50, height: 0, marginBottom: 0 }}
					transition={{ duration: 0.3, ease: "easeOut" }}
					className="list-none"
				>
					<div 
                        onClick={handleCardClick}
                        className={`rounded-[14px] transition-all duration-300 p-5 flex flex-col justify-between gap-4 cursor-pointer relative overflow-hidden backdrop-blur-xl ${!isCompressed ? 'md:flex-row md:items-center md:gap-6' : ''} ${isSelected ? 'bg-gray-50/50 dark:bg-white/[0.06] border-gray-300 dark:border-white/[0.12] shadow-sm border-l-[3px] border-l-red-500/80' : 'bg-white dark:bg-black/20 border border-[#e2e8f0] dark:border-white/[0.06] shadow-sm hover:border-gray-300 dark:hover:border-white/[0.12] dark:hover:bg-white/[0.03] border-l-[1px]'}`}
                    >
						{isSelected && <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.15] to-transparent mix-blend-overlay pointer-events-none" />}
						
						{/* Left Side: Detail stack */}
						<div className="flex-1 min-w-0 flex flex-col gap-2">
							{/* Top row: Title and Badges */}
							<div className="flex flex-wrap items-center gap-3">
								<a
									href={problem.link || "#"}
									target="_blank"
									rel="noopener noreferrer"
									className={`font-medium tracking-tight text-gray-900 dark:text-[rgba(255,255,255,0.95)] hover:text-black dark:hover:text-white transition-colors inline-flex items-center gap-2 ${isCompressed ? 'text-base' : 'text-[17px]'}`}
								>
									{problem.name}
									{problem.link && <LinkIcon className="w-3.5 h-3.5 text-gray-400 dark:text-[#888]" strokeWidth={2} />}
								</a>
							</div>

                            {!isCompressed && (
							    <p className="text-[13px] font-medium text-gray-500 dark:text-[#888]">
								    Categories: <span className="text-gray-700 dark:text-[rgba(255,255,255,0.7)]">{problem.category.length ? problem.category.join(", ") : "None"}</span>
							    </p>
                            )}

							{/* Separator Line */}
							<div className={`w-full h-px bg-gray-100 dark:bg-white/[0.06] ${isCompressed ? 'my-0.5' : 'my-1'}`} />

							<div className="flex flex-wrap items-center justify-between gap-4 text-[13px] font-medium text-gray-500 dark:text-[#888]">
								<div className="flex items-center gap-4">
									<div className="flex items-center gap-1.5" title="Next Review Date">
										<Calendar className="w-3.5 h-3.5 opacity-70" strokeWidth={2} />
										<span>{formatDate(problem.nextReviewDate)}</span>
									</div>
									<div className="flex items-center gap-1.5" title="Total Reviews Done">
										<Repeat className="w-3.5 h-3.5 opacity-70" strokeWidth={2} />
										<span>{problem.reviewCount ?? 0} Reviews</span>
									</div>
								</div>
								
								{/* Left side aligned Badges for mobile, or if compressed */}
								<div className={`${!isCompressed ? 'md:hidden' : ''} flex items-center gap-2`}>
									{problem.isStuck && (
										<div className="px-2.5 py-0.5 border rounded-full text-[11px] font-medium tracking-wide bg-red-50 dark:bg-rose-500/[0.04] border-red-200 dark:border-rose-500/20 text-red-600 dark:text-rose-400">
											Stuck
										</div>
									)}
									<div className={`px-2.5 py-0.5 border rounded-full text-[11px] font-medium tracking-wide ${difficultyStyle.bg} ${difficultyStyle.color}`}>
										{problem.difficulty}
									</div>
									{problem.platformRating && (
										<div className="px-2 py-0.5 rounded-[6px] text-[10px] font-bold border border-[#2B73FF]/30 bg-[#2B73FF]/10 text-[#2B73FF] dark:border-[#2B73FF]/40 dark:bg-[#2B73FF]/20 dark:text-[#5F9CFF] font-mono tracking-wide">
											{problem.platformRating}
										</div>
									)}
								</div>
							</div>
						</div>

						{/* Right Side: Status Badges and Actions */}
						<div className={`flex flex-col items-end justify-between gap-4 self-stretch pt-2 ${!isCompressed ? 'md:w-auto md:pt-0' : 'w-full'}`}>
							
							{/* Badges on Desktop */}
                            {!isCompressed && (
							    <div className="hidden md:flex items-center gap-2.5">
								    {problem.isStuck && (
									    <div className="px-2.5 py-0.5 border rounded-full text-[11px] font-medium tracking-wide bg-red-50 dark:bg-rose-500/[0.04] border-red-200 dark:border-rose-500/20 text-red-600 dark:text-rose-400">
										    Stuck
									    </div>
								    )}
								    <div className={`px-2.5 py-0.5 border rounded-full text-[11px] font-medium tracking-wide bg-transparent ${difficultyStyle.bg} ${difficultyStyle.color}`}>
									    {problem.difficulty}
								    </div>
									{problem.platformRating && (
										<div className="px-2 py-0.5 rounded-[6px] text-[10px] font-bold border border-[#2B73FF]/30 bg-[#2B73FF]/10 text-[#2B73FF] dark:border-[#2B73FF]/40 dark:bg-[#2B73FF]/20 dark:text-[#5F9CFF] font-mono tracking-wide">
											{problem.platformRating}
										</div>
									)}
							    </div>
                            )}

							{/* Action Control */}
							<div className={`flex items-center gap-2.5 w-full justify-end mt-auto ${!isCompressed ? 'md:w-auto' : ''}`}>
								<Select value={rating} onValueChange={setRating} disabled={submitting}>
									<SelectTrigger className={`bg-white dark:bg-white/[0.04] border-gray-200 dark:border-white/[0.08] shadow-sm text-[13px] font-medium dark:text-[rgba(255,255,255,0.9)] focus:ring-0 ${isCompressed ? 'flex-1 h-8' : 'w-[140px] md:w-[150px] h-9'}`} aria-label="Select review rating">
										<SelectValue placeholder="How hard?" />
									</SelectTrigger>
									<SelectContent className="dark:bg-[#111] dark:border-white/[0.08] text-[13px] dark:text-[rgba(255,255,255,0.9)]">
										<SelectItem value="1">Again (Forgot)</SelectItem>
										<SelectItem value="2">Hard</SelectItem>
										<SelectItem value="3">Good</SelectItem>
										<SelectItem value="4">Easy</SelectItem>
									</SelectContent>
								</Select>
								<Button
									onClick={handleReview}
									disabled={submitting || !rating}
									className={`p-0 bg-gray-900 text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-white/90 shadow-sm transition-all active:scale-95 shrink-0 hover:shadow-md ${isCompressed ? 'h-8 w-8 rounded-md' : 'h-9 w-9 rounded-md'}`}
								>
									{submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-4 h-4" strokeWidth={2.5}/>}
								</Button>
							</div>
						</div>

					</div>
				</motion.li>
			)}
		</AnimatePresence>
	)
})
