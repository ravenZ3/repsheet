"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useMemo } from "react"
import { Search, X, Filter, SortAsc, SortDesc } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import Fuse from "fuse.js"
import debounce from "lodash.debounce"
// Import the enums from the Prisma client to use their actual values
import { Difficulty, Status, type Problem } from "@prisma/client"

interface SearchBarProps {
	problems: Problem[]
	onResults: (filtered: Problem[]) => void
}

interface FilterState {
	difficulty: string
	status: string
	platform: string
	categories: string[]
}

// Define options programmatically from the enums to ensure they are always in sync
const DIFFICULTY_OPTIONS = ["All", ...Object.values(Difficulty)]
const STATUS_OPTIONS = ["All", ...Object.values(Status)]

const SORT_OPTIONS = [
	{ value: "name", label: "Name" },
	{ value: "difficulty", label: "Difficulty" },
	{ value: "status", label: "Status" },
	{ value: "platform", label: "Platform" },
	{ value: "lastReview", label: "Recently Reviewed" },
]

export default function SearchBar({ problems, onResults }: SearchBarProps) {
	const [query, setQuery] = useState("")
	const [showFilters, setShowFilters] = useState(false)
	const [sortBy, setSortBy] = useState("name")
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
	const [filters, setFilters] = useState<FilterState>({
		difficulty: "All",
		status: "All",
		platform: "All",
		categories: [],
	})

	const uniquePlatforms = useMemo(() => {
		const platforms = [...new Set(problems.map((p) => p.platform))].filter(
			(p): p is string => !!p
		)
		return ["All", ...platforms.sort()]
	}, [problems])

	const uniqueCategories = useMemo(() => {
		const categories = [
			...new Set(problems.flatMap((p) => p.category || [])),
		].filter(Boolean)
		return categories.sort()
	}, [problems])

	const fuse = useMemo(
		() =>
			new Fuse(problems, {
				keys: [
					"name",
					"platform",
					"difficulty",
					"status",
					"category",
					"notes",
					"mistakesMade",
				],
				threshold: 0.3,
				includeScore: true,
			}),
		[problems]
	)

	useEffect(() => {
		const debouncedSearch = debounce(() => {
			let filtered: Problem[] = query.trim()
				? fuse.search(query).map((r) => r.item)
				: [...problems]

			// Apply filters
			if (filters.difficulty !== "All") {
				filtered = filtered.filter(
					(p) => p.difficulty === filters.difficulty
				)
			}
			if (filters.status !== "All") {
				filtered = filtered.filter((p) => p.status === filters.status)
			}
			if (filters.platform !== "All") {
				filtered = filtered.filter(
					(p) => p.platform === filters.platform
				)
			}
			if (filters.categories.length > 0) {
				filtered = filtered.filter((p) =>
					filters.categories.some((cat) => p.category?.includes(cat))
				)
			}

			// Sort results
			filtered.sort((a, b) => {
				let aVal: string | number, bVal: string | number

				switch (sortBy) {
					case "difficulty":
						// Use the Difficulty enum for a type-safe sorting map
						const diffOrder: Record<Difficulty, number> = {
							[Difficulty.Easy]: 1,
							[Difficulty.Medium]: 2,
							[Difficulty.Hard]: 3,
						}
						aVal = diffOrder[a.difficulty]
						bVal = diffOrder[b.difficulty]
						break
					case "status":
						// Use the Status enum for a type-safe sorting map
						const statusOrder: Record<Status, number> = {
							[Status.ToRevise]: 1,
							[Status.Revisited]: 2,
							[Status.Stuck]: 3,
							[Status.Solved]: 4,
						}
						aVal = statusOrder[a.status]
						bVal = statusOrder[b.status]
						break
					case "lastReview":
						aVal = a.lastReview
							? new Date(a.lastReview).getTime()
							: 0
						bVal = b.lastReview
							? new Date(b.lastReview).getTime()
							: 0
						break
					default:
						const key = sortBy as keyof Problem
						aVal = a[key]?.toString().toLowerCase() || ""
						bVal = b[key]?.toString().toLowerCase() || ""
				}

				const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
				return sortOrder === "asc" ? comparison : -comparison
			})

			onResults(filtered)
		}, 200)

		debouncedSearch()
		return () => debouncedSearch.cancel()
	}, [query, filters, sortBy, sortOrder, problems, onResults, fuse])

	const handleCategoryToggle = (category: string) => {
		setFilters((prev) => ({
			...prev,
			categories: prev.categories.includes(category)
				? prev.categories.filter((c) => c !== category)
				: [...prev.categories, category],
		}))
	}

	const clearFilters = () => {
		setQuery("")
		setFilters({
			difficulty: "All",
			status: "All",
			platform: "All",
			categories: [],
		})
		setSortBy("name")
		setSortOrder("asc")
	}

	const hasActiveFilters =
		query ||
		filters.difficulty !== "All" ||
		filters.status !== "All" ||
		filters.platform !== "All" ||
		filters.categories.length > 0

	return (
		<motion.div
			className="mb-6 space-y-4"
			initial={{ opacity: 0, y: -20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
		>
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
				<Input
					placeholder="🔍 Search problems, notes, mistakes..."
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					className="pl-10 pr-20 text-sm border-slate-200 focus:ring-2 focus:ring-blue-500 transition-all"
				/>

				<div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
					<AnimatePresence>
						{query && (
							<motion.button
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.8 }}
								onClick={() => setQuery("")}
								className="p-1 rounded-full hover:bg-slate-100"
							>
								<X className="w-3 h-3 text-slate-400" />
							</motion.button>
						)}
					</AnimatePresence>

					<motion.button
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={() => setShowFilters(!showFilters)}
						className={`p-1 rounded-full transition-colors ${
							showFilters || hasActiveFilters
								? "bg-blue-100 text-blue-600"
								: "hover:bg-slate-100 text-slate-400"
						}`}
					>
						<Filter className="w-3 h-3" />
					</motion.button>
				</div>
			</div>

			<AnimatePresence>
				{showFilters && (
					<motion.div
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: "auto" }}
						exit={{ opacity: 0, height: 0 }}
						className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-4"
					>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<div>
								<label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">
									Sort by
								</label>
								<div className="flex items-center gap-1">
									<Select
										value={sortBy}
										onValueChange={setSortBy}
									>
										<SelectTrigger className="h-8 text-xs">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{SORT_OPTIONS.map((option) => (
												<SelectItem
													key={option.value}
													value={option.value}
												>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<Button
										variant="outline"
										size="sm"
										onClick={() =>
											setSortOrder((prev) =>
												prev === "asc" ? "desc" : "asc"
											)
										}
										className="h-8 w-8 p-0"
									>
										{sortOrder === "asc" ? (
											<SortAsc className="w-3 h-3" />
										) : (
											<SortDesc className="w-3 h-3" />
										)}
									</Button>
								</div>
							</div>

							<div>
								<label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">
									Difficulty
								</label>
								<Select
									value={filters.difficulty}
									onValueChange={(v) =>
										setFilters((p) => ({
											...p,
											difficulty: v,
										}))
									}
								>
									<SelectTrigger className="h-8 text-xs">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{DIFFICULTY_OPTIONS.map((o) => (
											<SelectItem key={o} value={o}>
												{o}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div>
								<label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">
									Status
								</label>
								<Select
									value={filters.status}
									onValueChange={(v) =>
										setFilters((p) => ({ ...p, status: v }))
									}
								>
									<SelectTrigger className="h-8 text-xs">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{STATUS_OPTIONS.map((o) => (
											<SelectItem key={o} value={o}>
												{o}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div>
								<label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">
									Platform
								</label>
								<Select
									value={filters.platform}
									onValueChange={(v) =>
										setFilters((p) => ({
											...p,
											platform: v,
										}))
									}
								>
									<SelectTrigger className="h-8 text-xs">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{uniquePlatforms.map((o) => (
											<SelectItem key={o} value={o}>
												{o}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						{uniqueCategories.length > 0 && (
							<div>
								<label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2 block">
									Categories
								</label>
								<div className="flex flex-wrap gap-2">
									{uniqueCategories.map((category) => (
										<motion.div
											key={category}
											whileHover={{ scale: 1.05 }}
											whileTap={{ scale: 0.95 }}
										>
											<Badge
												variant={
													filters.categories.includes(
														category
													)
														? "default"
														: "secondary"
												}
												className="cursor-pointer"
												onClick={() =>
													handleCategoryToggle(
														category
													)
												}
											>
												{category}
											</Badge>
										</motion.div>
									))}
								</div>
							</div>
						)}

						<div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
							<span className="text-xs text-slate-500 dark:text-slate-400">
								{problems.length} total problems
							</span>
							{hasActiveFilters && (
								<Button
									variant="ghost"
									size="sm"
									onClick={clearFilters}
									className="text-xs h-7"
								>
									Clear all filters
								</Button>
							)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{hasActiveFilters && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						className="flex items-center flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300"
					>
						<span className="font-medium">Active filters:</span>
						{query && (
							<Badge variant="outline">&quot;{query}&quot;</Badge>
						)}
						{filters.difficulty !== "All" && (
							<Badge variant="outline">
								{filters.difficulty}
							</Badge>
						)}
						{filters.status !== "All" && (
							<Badge variant="outline">{filters.status}</Badge>
						)}
						{filters.platform !== "All" && (
							<Badge variant="outline">{filters.platform}</Badge>
						)}
						{filters.categories.map((cat) => (
							<Badge key={cat} variant="outline">
								{cat}
							</Badge>
						))}
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	)
}
