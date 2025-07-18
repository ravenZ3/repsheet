//app/components/ProblemReviewCard.tsx
"use client"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle, Loader2, Calendar, Repeat, Link as LinkIcon } from "lucide-react"
import { toast } from "sonner"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import type { Problem } from "@prisma/client"
// Import the enums from the Prisma client to use their values
import { Status, Difficulty } from "@prisma/client"

interface ProblemReviewCardProps {
	problem: Problem
	onUpdate?: (id: string, updates: Partial<Problem> | null) => void
}

export default function ProblemReviewCard({
	problem,
	onUpdate,
}: ProblemReviewCardProps) {
	const [rating, setRating] = useState<string>("")
	const [submitting, setSubmitting] = useState(false)
	const [isVisible, setIsVisible] = useState(true)

	// --- Style Hooks (Corrected with Enums) ---
	const statusStyle = useMemo(() => {
		// Use the imported `Status` enum for type-safe comparison
		switch (problem.status) {
			case Status.Solved:
				return {
					color: "text-emerald-600 dark:text-emerald-400",
					bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700",
				}
			case Status.ToRevise: // Use the correct enum member
				return {
					color: "text-amber-600 dark:text-amber-400",
					bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700",
				}
			case Status.Stuck:
				return {
					color: "text-red-600 dark:text-red-400",
					bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700",
				}
			case Status.Revisited: // Use the correct enum member
			default:
				return {
					color: "text-gray-600 dark:text-gray-400",
					bg: "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700",
				}
		}
	}, [problem.status])

	const difficultyStyle = useMemo(() => {
		// Use the imported `Difficulty` enum for type-safe comparison
		switch (problem.difficulty) {
			case Difficulty.Easy:
				return {
					color: "text-green-600 dark:text-green-400",
					bg: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700",
				}
			case Difficulty.Medium:
				return {
					color: "text-yellow-600 dark:text-yellow-400",
					bg: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700",
				}
			case Difficulty.Hard:
				return {
					color: "text-red-600 dark:text-red-400",
					bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700",
				}
			default:
				return {
					color: "text-gray-600 dark:text-gray-400",
					bg: "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700",
				}
		}
	}, [problem.difficulty])

	// --- Handlers ---
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

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.error || "Failed to mark review.")
			}

			const updatedProblem = await response.json()
			toast.success(`"${problem.name}" marked as reviewed!`)
			setIsVisible(false)
			onUpdate?.(problem.id, updatedProblem)
			setRating("")
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "An unknown error occurred."
			toast.error(errorMessage)
		} finally {
			setSubmitting(false)
		}
	}, [problem.id, problem.name, rating, onUpdate])

	const formatDate = (date: Date | null) => {
		if (!date) return "N/A"
		return new Date(date).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		})
	}

	return (
		<AnimatePresence>
			{isVisible && (
				<motion.li
					layout
					initial={{ opacity: 0, y: 50, scale: 0.95 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					exit={{ opacity: 0, x: -100, height: 0, marginBottom: 0 }}
					transition={{ duration: 0.4, ease: "easeOut" }}
					className="list-none" // Remove default list styling
				>
					<div className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-lg transition-all duration-300 p-6 flex flex-col md:flex-row items-start justify-between gap-6">
						{/* Left Side: Problem Info */}
						<div className="flex-1 min-w-0">
							<a
								href={problem.link || "#"}
								target="_blank"
								rel="noopener noreferrer"
								className="text-lg font-semibold text-gray-800 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-2"
							>
								{problem.name}
								{problem.link && <LinkIcon className="w-4 h-4 text-gray-400" />}
							</a>
							<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
								Categories: {problem.category.length ? problem.category.join(", ") : "None"}
							</p>

							<div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400 mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
								<div className="flex items-center gap-2" title="Next Review Date">
									<Calendar className="w-4 h-4" />
									<span>{formatDate(problem.nextReviewDate)}</span>
								</div>
								<div className="flex items-center gap-2" title="Total Reviews Done">
									<Repeat className="w-4 h-4" />
									<span>{problem.reviewCount ?? 0} Reviews</span>
								</div>
							</div>
						</div>

						{/* Right Side: Status Badges and Actions */}
						<div className="flex flex-col items-stretch md:items-end gap-3 w-full md:w-auto">
							<div className="flex items-center justify-end gap-2">
								<div
									className={`px-3 py-1 border rounded-full text-xs font-medium text-center ${difficultyStyle.bg} ${difficultyStyle.color}`}
								>
									{problem.difficulty}
								</div>
								<div
									className={`px-3 py-1 border rounded-full text-xs font-medium text-center ${statusStyle.bg} ${statusStyle.color}`}
								>
									{problem.status}
								</div>
							</div>

							<div className="flex items-center gap-2 mt-2">
								<Select value={rating} onValueChange={setRating} disabled={submitting}>
									<SelectTrigger className="w-full md:w-[150px]" aria-label="Select review rating">
										<SelectValue placeholder="How hard was it?" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="1">Again (Forgot)</SelectItem>
										<SelectItem value="2">Hard</SelectItem>
										<SelectItem value="3">Good</SelectItem>
										<SelectItem value="4">Easy</SelectItem>
									</SelectContent>
								</Select>
								<Button
									onClick={handleReview}
									disabled={submitting || !rating}
									className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
								>
									{submitting ? (
										<Loader2 className="w-4 h-4 animate-spin" />
									) : (
										<CheckCircle className="w-4 h-4" />
									)}
								</Button>
							</div>
						</div>
					</div>
				</motion.li>
			)}
		</AnimatePresence>
	)
}