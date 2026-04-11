"use client"

import { useState, useEffect, useCallback } from "react"
import SearchBar from "@/components/SearchBar"
import ProblemRow from "@/components/ProblemRow"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import type { Problem } from "@prisma/client"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"

interface ProblemsClientProps {
	initialPaginatedProblems: Problem[]
	totalProblems: number
	currentPage: number
	pageSize: number
}

export default function ProblemsClient({
	initialPaginatedProblems,
	totalProblems,
	currentPage,
	pageSize,
}: ProblemsClientProps) {
	const router = useRouter()

	// Display State (What actually renders)
	const [displayProblems, setDisplayProblems] = useState<Problem[]>(
		initialPaginatedProblems
	)

	// Background Cache State
	const [allProblemsCache, setAllProblemsCache] = useState<Problem[]>([])
	const [isCacheLoaded, setIsCacheLoaded] = useState(false)
	const [isSearchActive, setIsSearchActive] = useState(false)

	// Fetch Full Database Slice Quietly
	useEffect(() => {
		fetch("/api/problem/all")
			.then((res) => res.json())
			.then((data) => {
				if (Array.isArray(data)) {
					setAllProblemsCache(data)
					setIsCacheLoaded(true)
				}
			})
			.catch((err) => console.error("Failed to cache problems:", err))
	}, [])

	// Respond to standard Server Pagination events changing
	useEffect(() => {
		if (!isSearchActive) {
			setDisplayProblems(initialPaginatedProblems)
		}
	}, [initialPaginatedProblems, isSearchActive])

	// Filter / Search callback
	const handleSearchResults = useCallback(
		(filtered: Problem[], activeFilters: boolean) => {
			setIsSearchActive(activeFilters)
			if (activeFilters) {
				setDisplayProblems(filtered)
			} else {
				setDisplayProblems(initialPaginatedProblems)
			}
		},
		[initialPaginatedProblems]
	)

	const handleProblemUpdate = useCallback(
		(id: string, updates: Partial<Problem> | null) => {
			const updateFn = (prev: Problem[]) => {
				if (updates === null) return prev.filter((p) => p.id !== id)
				return prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
			}
			setDisplayProblems(updateFn)
			setAllProblemsCache(updateFn) // keep cache completely in sync
		},
		[]
	)

	const totalPages = Math.max(1, Math.ceil(totalProblems / pageSize))

	return (
		<div className="space-y-6">
			{/* Feed either the cache or the 15 items into the Search Bar. 
          If cache isn't loaded yet, it disables itself safely. */}
			<SearchBar
				problems={
					isCacheLoaded ? allProblemsCache : initialPaginatedProblems
				}
				onResults={handleSearchResults}
				disabled={!isCacheLoaded && allProblemsCache.length === 0}
			/>

			<div className="space-y-4">
				<AnimatePresence mode="popLayout">
					{displayProblems.map((problem) => (
						<ProblemRow
							key={problem.id}
							problem={problem}
							onUpdate={handleProblemUpdate}
						/>
					))}
				</AnimatePresence>

				{displayProblems.length === 0 && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="text-center py-12 text-gray-500"
					>
						<p>No problems found matching your criteria.</p>
					</motion.div>
				)}
			</div>

			{/* Pagination Controls only render when user is not actively searching */}
			{!isSearchActive && totalPages > 1 && (
				<div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-4 border-t border-gray-200 dark:border-gray-800">
					<p className="text-sm font-medium text-gray-600 dark:text-gray-400">
						Showing {displayProblems.length} of {totalProblems}{" "}
						problems
					</p>
					<div className="flex items-center gap-4">
						<Button
							variant="outline"
							disabled={currentPage <= 1}
							onClick={() =>
								router.push(`?page=${currentPage - 1}`)
							}
							className="px-3"
						>
							<ChevronLeft className="w-4 h-4 mr-1" />
							Prev
						</Button>
						<span className="text-sm font-medium">
							Page {currentPage} of {totalPages}
						</span>
						<Button
							variant="outline"
							disabled={currentPage >= totalPages}
							onClick={() =>
								router.push(`?page=${currentPage + 1}`)
							}
							className="px-3"
						>
							Next
							<ChevronRight className="w-4 h-4 ml-1" />
						</Button>
					</div>
				</div>
			)}
		</div>
	)
}
