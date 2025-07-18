"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import { AlertCircle, CheckCircle } from "lucide-react"
import ProblemReviewCard from "@/components/ProblemReviewCard"
// FIX: The 'Status' type is not used directly, so it can be removed from the import.
// We only need the main 'Problem' type.
import type { Problem } from "@prisma/client"

// --- Types ---
// FIX: Removed the conflicting 'ReviewProblem' and 'ReviewDifficulty' types.
// We will use the standard 'Problem' type from Prisma for consistency.

interface ReviewPageContentProps {
	problems: Problem[] // Use the standard Problem type
	totalCount: number
	reviewedToday: number
	error: string | null
}

export default function ReviewPageContent({
	problems: initialProblems,
	totalCount,
	reviewedToday,
	error,
}: ReviewPageContentProps) {
	// FIX: State now correctly uses the standard 'Problem' type.
	const [problemList, setProblemList] = useState<Problem[]>(initialProblems)

	// FIX: The 'updates' parameter now correctly uses Partial<Problem>, matching the child component.
	const handleProblemUpdate = useCallback(
		(id: string, updates: Partial<Problem> | null) => {
			if (updates === null) {
				// Deletion
				setProblemList((current) => current.filter((p) => p.id !== id))
			} else {
				// Update
				setProblemList((current) =>
					current.map((p) => (p.id === id ? { ...p, ...updates } : p))
				)
			}
		},
		[]
	)

	if (error) {
		return (
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="max-w-4xl mx-auto mt-10 px-4"
			>
				<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
					<div className="flex items-center">
						<AlertCircle className="text-red-400 mr-2" />
						<h3 className="text-red-800 dark:text-red-200 font-medium">
							Error loading review page
						</h3>
					</div>
					<p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
				</div>
			</motion.div>
		)
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, ease: "easeOut" }}
			className="max-w-4xl mx-auto mt-10 px-4 space-y-8"
		>
			<div className="text-center">
				<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
					📚 Problems Due for Review
				</h1>
				<p className="text-gray-600 dark:text-gray-400">
					Review your coding problems to reinforce learning.
				</p>
			</div>

			<Card className="bg-white/40 dark:bg-white/10 border-gray-300 dark:border-gray-700 backdrop-blur-lg">
				<CardHeader>
					<CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
						📊 Progress Today
					</CardTitle>
				</CardHeader>
				<CardContent className="text-gray-800 dark:text-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div className="text-center">
						<p className="text-2xl font-bold">{problemList.length}</p>
						<p className="text-sm text-gray-600 dark:text-gray-400">Due Today</p>
					</div>
					<div className="text-center">
						<p className="text-2xl font-bold">{reviewedToday}</p>
						<p className="text-sm text-gray-600 dark:text-gray-400">Reviewed Today</p>
					</div>
					<div className="text-center">
						<p className="text-2xl font-bold">{totalCount}</p>
						<p className="text-sm text-gray-600 dark:text-gray-400">Total Problems</p>
					</div>
				</CardContent>
			</Card>

			<div className="space-y-4">
				<AnimatePresence>
					{problemList.length === 0 ? (
						<motion.div
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							className="text-center py-10"
						>
							<CheckCircle className="mx-auto h-12 w-12 text-green-500" />
							<h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
								You're all caught up!
							</h3>
							<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
								No problems to review today. Come back tomorrow.
							</p>
						</motion.div>
					) : (
						problemList.map((problem) => (
							// This now passes the correct function type to the child component
							<ProblemReviewCard
								key={problem.id}
								problem={problem}
								onUpdate={handleProblemUpdate}
							/>
						))
					)}
				</AnimatePresence>
			</div>
		</motion.div>
	)
}