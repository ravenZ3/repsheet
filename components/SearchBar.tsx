"use client"

import { Input } from "@/components/ui/input"
import { useState, useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { Search, X, Filter, SortAsc, SortDesc, Star } from "lucide-react"
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
import { Difficulty, type Problem } from "@prisma/client"

interface SearchBarProps {
	problems: Problem[]
	onResults: (filtered: Problem[], isActive: boolean) => void
	showFilters?: boolean
	onShowFilters?: (show: boolean) => void
	filterPanelContainer?: HTMLElement | null
}

interface FilterState {
	difficulty: string
	isStuck: boolean | "All"
	platform: string
	categories: string[]
	isStarred: boolean
}

const DIFFICULTY_OPTIONS = ["All", ...Object.values(Difficulty)]


const SORT_OPTIONS = [
	{ value: "name", label: "Name" },
	{ value: "difficulty", label: "Difficulty" },

	{ value: "platform", label: "Platform" },
	{ value: "lastReview", label: "Recently Reviewed" },
]

export default function SearchBar({ problems, onResults, showFilters: externalShowFilters, onShowFilters: externalOnShowFilters, filterPanelContainer }: SearchBarProps) {
	const [query, setQuery] = useState("")
	const [internalShowFilters, setInternalShowFilters] = useState(false)
	const showFilters = externalShowFilters ?? internalShowFilters
	const setShowFilters = externalOnShowFilters ?? setInternalShowFilters
	const [sortBy, setSortBy] = useState("name")
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
	const [filters, setFilters] = useState<FilterState>({
		difficulty: "All",
		isStuck: "All",
		platform: "All",
		categories: [],
		isStarred: false,
	})
	const [showMoreFilters, setShowMoreFilters] = useState(true)

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

			if (filters.difficulty !== "All") filtered = filtered.filter((p) => p.difficulty === filters.difficulty)
			if (filters.isStuck !== "All") filtered = filtered.filter((p) => p.isStuck === filters.isStuck)
			if (filters.platform !== "All") filtered = filtered.filter((p) => p.platform === filters.platform)
			if (filters.categories.length > 0) {
				filtered = filtered.filter((p) =>
					filters.categories.some((cat) => p.category?.includes(cat))
				)
			}
			if (filters.isStarred) filtered = filtered.filter((p) => p.isStarred)

			filtered.sort((a, b) => {
				let aVal: string | number, bVal: string | number
				switch (sortBy) {
					case "difficulty":
						const diffOrder: Record<Difficulty, number> = { [Difficulty.Easy]: 1, [Difficulty.Medium]: 2, [Difficulty.Hard]: 3 }
						aVal = diffOrder[a.difficulty]
						bVal = diffOrder[b.difficulty]
						break

					case "lastReview":
						aVal = a.lastReview ? new Date(a.lastReview).getTime() : 0
						bVal = b.lastReview ? new Date(b.lastReview).getTime() : 0
						break
					default:
						const key = sortBy as keyof Problem
						aVal = a[key]?.toString().toLowerCase() || ""
						bVal = b[key]?.toString().toLowerCase() || ""
				}
				const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
				return sortOrder === "asc" ? comparison : -comparison
			})

			const isActive = !!(query.trim() || filters.difficulty !== "All" || filters.isStuck !== "All" || filters.platform !== "All" || filters.categories.length > 0 || filters.isStarred)
			onResults(filtered, isActive)
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
		setFilters({ difficulty: "All", isStuck: "All", platform: "All", categories: [], isStarred: false })
		setSortBy("name")
		setSortOrder("asc")
	}

	const hasActiveFilters =
		query ||
		filters.difficulty !== "All" ||
		filters.isStuck !== "All" ||
		filters.platform !== "All" ||
		filters.categories.length > 0 ||
		filters.isStarred

	return (
		<div className="mb-6 space-y-4">
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
				<Input
					placeholder="Search problems, notes, mistakes..."
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					className="pl-10 pr-20 text-sm border-gray-200 dark:border-white/[0.08] bg-transparent focus-visible:ring-1 focus-visible:ring-gray-300 dark:focus-visible:ring-white/[0.15] transition-all"
				/>

				<div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
					{query && (
						<button
							onClick={() => setQuery("")}
							className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/[0.06]"
						>
							<X className="w-3 h-3 text-gray-400" />
						</button>
					)}
					<button
						onClick={() => setFilters((p) => ({ ...p, isStarred: !p.isStarred }))}
						className={`p-1 rounded-full transition-colors ${
							filters.isStarred
								? "bg-yellow-100 text-yellow-500 dark:bg-yellow-500/20 dark:text-yellow-400"
								: "hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-400"
						}`}
						title="Show starred only"
					>
						<Star className="w-3 h-3" fill={filters.isStarred ? "currentColor" : "none"} />
					</button>
					<button
						onClick={() => setShowFilters(!showFilters)}
						className={`p-1 rounded-full transition-colors ${
							showFilters || hasActiveFilters
								? "bg-gray-100 text-gray-700 dark:bg-white/[0.08] dark:text-[rgba(255,255,255,0.8)]"
								: "hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-400"
						}`}
					>
						<Filter className="w-3 h-3" />
					</button>
				</div>
			</div>

			{(() => {
				if (!showFilters) return null
				const panelContent = (
					<div className={filterPanelContainer ? "" : "border border-gray-200 dark:border-white/[0.08] rounded-[10px] bg-white dark:bg-white/[0.03] overflow-hidden"}>
						{/* Main filters row */}
						<div className="flex flex-wrap gap-3 p-3">
							<div className="flex items-center gap-1.5 min-w-0">
								<span className="text-[11px] font-medium text-gray-400 dark:text-[#555] shrink-0">Sort</span>
								<Select value={sortBy} onValueChange={setSortBy}>
									<SelectTrigger className="h-4 text-[11px] !px-2 !py-0 border-gray-200 dark:border-white/[0.08] bg-transparent dark:text-[rgba(255,255,255,0.8)] w-[110px]"><SelectValue /></SelectTrigger>
									<SelectContent>
										{SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
									</SelectContent>
								</Select>
								<button
									onClick={() => setSortOrder((p) => p === "asc" ? "desc" : "asc")}
									className="h-4 w-4 flex items-center justify-center rounded-md border border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-[#888] hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors shrink-0"
								>
									{sortOrder === "asc" ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />}
								</button>
							</div>

							<div className="flex items-center gap-1.5">
								<span className="text-[11px] font-medium text-gray-400 dark:text-[#555] shrink-0">Difficulty</span>
								<Select value={filters.difficulty} onValueChange={(v) => setFilters((p) => ({ ...p, difficulty: v }))}>
									<SelectTrigger className="h-4 text-[11px] !px-2 !py-0 border-gray-200 dark:border-white/[0.08] bg-transparent dark:text-[rgba(255,255,255,0.8)] w-[90px]"><SelectValue /></SelectTrigger>
									<SelectContent>
										{DIFFICULTY_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
									</SelectContent>
								</Select>
							</div>

							<div className="flex items-center gap-1.5">
								<span className="text-[11px] font-medium text-gray-400 dark:text-[#555] shrink-0">Platform</span>
								<Select value={filters.platform} onValueChange={(v) => setFilters((p) => ({ ...p, platform: v }))}>
									<SelectTrigger className="h-4 text-[11px] !px-2 !py-0 border-gray-200 dark:border-white/[0.08] bg-transparent dark:text-[rgba(255,255,255,0.8)] w-[110px]"><SelectValue /></SelectTrigger>
									<SelectContent>
										{uniquePlatforms.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
									</SelectContent>
								</Select>
							</div>

							<div className="flex items-center gap-1.5">
								<span className="text-[11px] font-medium text-gray-400 dark:text-[#555] shrink-0">Stuck</span>
								<Select value={filters.isStuck.toString()} onValueChange={(v) => setFilters((p) => ({ ...p, isStuck: v === "All" ? "All" : v === "true" }))}>
									<SelectTrigger className="h-4 text-[11px] !px-2 !py-0 border-gray-200 dark:border-white/[0.08] bg-transparent dark:text-[rgba(255,255,255,0.8)] w-[70px]"><SelectValue /></SelectTrigger>
									<SelectContent>
										{["All", "true", "false"].map((o) => <SelectItem key={o} value={o}>{o === "true" ? "Yes" : o === "false" ? "No" : "All"}</SelectItem>)}
									</SelectContent>
								</Select>
							</div>

							{hasActiveFilters && (
								<button onClick={clearFilters} className="text-[11px] text-gray-400 dark:text-[#555] hover:text-gray-700 dark:hover:text-[#999] transition-colors ml-auto shrink-0">
									Clear
								</button>
							)}
						</div>

						{/* Categories */}
						{uniqueCategories.length > 0 && (
							<div className="border-t border-gray-100 dark:border-white/[0.05] px-3 py-2">
								<button
									onClick={() => setShowMoreFilters((p) => !p)}
									className="text-[11px] font-medium text-gray-400 dark:text-[#555] hover:text-gray-600 dark:hover:text-[#888] flex items-center gap-1 transition-colors"
								>
									{showMoreFilters ? "▲" : "▼"} Categories{filters.categories.length > 0 && ` (${filters.categories.length})`}
								</button>
								{showMoreFilters && (
									<div className="flex flex-wrap gap-1.5 mt-2">
										{uniqueCategories.map((cat) => (
											<button
												key={cat}
												onClick={() => handleCategoryToggle(cat)}
												className={`text-[11px] px-2 py-0.5 rounded-[5px] font-medium transition-colors border ${
													filters.categories.includes(cat)
														? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-black dark:border-white"
														: "border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-[#888] hover:border-gray-300 dark:hover:border-white/[0.15]"
												}`}
											>
												{cat}
											</button>
										))}
									</div>
								)}
							</div>
						)}
					</div>
				)
				return filterPanelContainer
					? createPortal(panelContent, filterPanelContainer)
					: panelContent
			})()}
			{hasActiveFilters && (
				<div className="flex items-center flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-300">
					<span className="font-medium">Active filters:</span>
					{query && <Badge variant="outline">&quot;{query}&quot;</Badge>}
					{filters.difficulty !== "All" && <Badge variant="outline">{filters.difficulty}</Badge>}
					{filters.isStuck !== "All" && <Badge variant="outline">Stuck: {filters.isStuck ? "Yes" : "No"}</Badge>}
					{filters.platform !== "All" && <Badge variant="outline">{filters.platform}</Badge>}
					{filters.categories.map((cat) => (<Badge key={cat} variant="outline">{cat}</Badge>))}
					{filters.isStarred && <Badge variant="outline">Starred</Badge>}
				</div>
			)}
		</div>
	)
}
