"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import SearchBar from "@/components/SearchBar"
import ProblemCard from "@/components/ProblemCard"
import ProblemDetail from "@/components/ProblemDetail"
import { Button } from "@/components/ui/button"
import type { Problem } from "@prisma/client"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

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
    const searchParams = useSearchParams()
    const selectedId = searchParams.get("selected")

    const [displayProblems, setDisplayProblems] = useState<Problem[]>(initialPaginatedProblems)
    const [allProblemsCache, setAllProblemsCache] = useState<Problem[]>(initialPaginatedProblems)
    const [isCacheLoaded, setIsCacheLoaded] = useState(false)
    const [isSearchActive, setIsSearchActive] = useState(false)
    const [showFilters, setShowFilters] = useState(false)
    const [filterContainer, setFilterContainer] = useState<HTMLElement | null>(null)

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

    useEffect(() => {
        if (!isSearchActive) {
            setDisplayProblems(initialPaginatedProblems)
        }
    }, [initialPaginatedProblems, isSearchActive])

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
            setAllProblemsCache(updateFn)
        },
        []
    )

    const handleSelect = useCallback(
        (id: string) => {
            setShowFilters(false)
            const params = new URLSearchParams(searchParams.toString())
            if (params.get("selected") === id) {
                params.delete("selected")
            } else {
                params.set("selected", id)
            }
            router.push(`?${params.toString()}`, { scroll: false })
        },
        [router, searchParams]
    )

    const handleClose = useCallback(() => {
        const params = new URLSearchParams(searchParams.toString())
        params.delete("selected")
        router.push(`?${params.toString()}`, { scroll: false })
    }, [router, searchParams])

    // Find selected problem — check display list first, then full cache
    const selectedProblem =
        displayProblems.find((p) => p.id === selectedId) ||
        allProblemsCache.find((p) => p.id === selectedId) ||
        null

    const totalPages = Math.max(1, Math.ceil(totalProblems / pageSize))

    return (
        <div className="lg:h-[calc(100dvh-5.5rem)] lg:overflow-hidden -my-8">
            <div className="lg:h-full max-w-6xl mx-auto px-4 py-4 flex flex-col gap-4 lg:gap-0">
                <div className={`grid gap-4 lg:h-full lg:min-h-0 ${selectedProblem || showFilters ? "grid-cols-1 lg:grid-cols-[400px_1fr]" : "grid-cols-1 lg:grid-cols-[400px]"}`}>
                    {/* Left: problem list */}
                    <div className="flex flex-col bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08] backdrop-blur-3xl rounded-[16px] shadow-2xl relative overflow-hidden lg:h-full lg:min-h-0">
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent mix-blend-overlay pointer-events-none" />
                        <div className="shrink-0 px-6 pt-6">
                            <h1 className="text-2xl italic mb-4 text-gray-900 dark:text-white [font-family:var(--font-playfair)]">
                                Dictionary
                            </h1>
                            <SearchBar
                                problems={isCacheLoaded ? allProblemsCache : initialPaginatedProblems}
                                onResults={handleSearchResults}
                                showFilters={showFilters}
                                onShowFilters={setShowFilters}
                                filterPanelContainer={filterContainer}
                            />
                        </div>

                        <div className="lg:flex-1 lg:overflow-y-auto lg:min-h-0 px-3 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            {displayProblems.map((problem) => (
                                <ProblemCard
                                    key={problem.id}
                                    problem={problem}
                                    isSelected={problem.id === selectedId}
                                    onSelect={handleSelect}
                                    onUpdate={handleProblemUpdate}
                                />
                            ))}
                            {displayProblems.length === 0 && (
                                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                    <p>No problems found matching your criteria.</p>
                                </div>
                            )}
                            {!isSearchActive && totalPages > 1 && (
                                <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-white/[0.06] px-1">
                                    <Button
                                        variant="outline"
                                        disabled={currentPage <= 1}
                                        onClick={() => {
                                            const params = new URLSearchParams(searchParams.toString())
                                            params.set("page", String(currentPage - 1))
                                            router.push(`?${params.toString()}`)
                                        }}
                                        className="border-gray-200 bg-transparent dark:border-white/[0.08] dark:text-[#888] hover:bg-gray-100 dark:hover:bg-white/[0.05] h-7 text-[11px] px-3"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                                        Prev
                                    </Button>
                                    <span className="text-[11px] font-medium text-gray-500 dark:text-[#666]">
                                        {currentPage} / {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        disabled={currentPage >= totalPages}
                                        onClick={() => {
                                            const params = new URLSearchParams(searchParams.toString())
                                            params.set("page", String(currentPage + 1))
                                            router.push(`?${params.toString()}`)
                                        }}
                                        className="border-gray-200 bg-transparent dark:border-white/[0.08] dark:text-[#888] hover:bg-gray-100 dark:hover:bg-white/[0.05] h-7 text-[11px] px-3"
                                    >
                                        Next
                                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: filters, detail panel, or placeholder */}
                    {showFilters ? (
                        <div className="h-full min-h-0 flex flex-col bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08] backdrop-blur-3xl rounded-[16px] shadow-2xl overflow-hidden relative">
                            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent mix-blend-overlay pointer-events-none" />
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.06] shrink-0">
                                <span className="text-[13px] font-semibold text-gray-700 dark:text-[rgba(255,255,255,0.8)]">Filters &amp; Sort</span>
                                <button
                                    onClick={() => setShowFilters(false)}
                                    className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                                >
                                    <X className="w-3.5 h-3.5 text-gray-400 dark:text-[#666]" />
                                </button>
                            </div>
                            <div
                                ref={(el) => setFilterContainer(el)}
                                className="flex-1 overflow-y-auto p-4"
                            />
                        </div>
                    ) : selectedProblem ? (
                        <div className="lg:h-full lg:min-h-0">
                            <ProblemDetail
                                key={selectedProblem.id}
                                problem={selectedProblem}
                                onUpdate={handleProblemUpdate}
                                onClose={handleClose}
                            />
                        </div>
                    ) : (
                        <div className="hidden lg:flex items-center justify-center text-gray-400 dark:text-[#555] text-[13px] font-medium opacity-40">
                            Select a problem to view details
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
