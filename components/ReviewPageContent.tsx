// app/components/ReviewPageContent.tsx

"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import type { Problem } from "@prisma/client"
import ProblemReviewCard from "./ProblemReviewCard"
import ProblemDetailPanel from "./ProblemDetailPanel"
import { AnimatePresence, motion } from "framer-motion"
import { useCallback } from "react"

interface ReviewPageContentProps {
	problems: Problem[]
	reviewedToday: number
    backlog: number
    daysToClear: number
	error: string | null
}

export default function ReviewPageContent({
	problems: initialProblems,
	reviewedToday: initialReviewedToday,
    backlog,
    daysToClear,
	error,
}: ReviewPageContentProps) {
	// 2. Instantiate the router
	const router = useRouter()
	const [problems, setProblems] = useState<Problem[]>(initialProblems)
	const [reviewedCount, setReviewedCount] = useState<number>(initialReviewedToday)
    const [selectedId, setSelectedId] = useState<string | null>(null)

    const selectedProblem = useMemo(() => problems.find(p => p.id === selectedId) || null, [problems, selectedId]);

	const handleProblemUpdate = useCallback((
		updatedProblemId: string,
		updates: Partial<Problem> | null,
		isReview: boolean = true
	) => {
		if (isReview) {
			// Instant client-side feedback for a great UX when marking complete
			setReviewedCount((currentCount) => currentCount + 1)
			setProblems((currentProblems) =>
				currentProblems.filter((p) => p.id !== updatedProblemId)
			)
            if (selectedId === updatedProblemId) setSelectedId(null);
		} else if (updates) {
			// If it's just a metadata update (like saving notes), keep it in the queue but update the text visually
			setProblems((currentProblems) =>
				currentProblems.map((p) => p.id === updatedProblemId ? { ...p, ...updates } as Problem : p)
			)
		}

		// 3. Trigger a server data refresh
		// This will re-run the `app/review/page.tsx` data fetching
		// and update any part of the UI that depends on it,
		// including layouts, without a full page reload.
		router.refresh()
	}, [router, selectedId])

	if (error) {
		return <p className="text-center text-red-500 py-8">Error: {error}</p>
	}

	return (
		<div className="container mx-auto p-4 md:p-6 max-w-6xl relative z-0">
			{/* Raycast-style glowing ambient red orb behind the interface */}
			<div className="hidden md:block fixed top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-red-600/[0.05] dark:bg-red-500/[0.07] blur-[100px] rounded-full pointer-events-none -z-10" style={{ willChange: "transform", transform: "translateZ(0)" }} />

			<Card className="bg-white dark:bg-black/40 border-[#e2e8f0] dark:border-white/[0.06] shadow-sm mb-8 rounded-2xl backdrop-blur-xl relative overflow-hidden">
				<div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent mix-blend-overlay" />
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-bold tracking-widest uppercase text-gray-500 dark:text-gray-400 flex items-center">
						<span className="mr-2 text-base">📊</span> Progress Today
					</CardTitle>
				</CardHeader>
				<CardContent className="text-gray-800 dark:text-gray-100 grid grid-cols-3 gap-4 pb-6">
					<div className="flex flex-col items-center text-center">
						<p className="text-3xl font-bold text-gray-900 dark:text-white mb-1.5">{problems.length}</p>
						<p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-500">
							Due Today
						</p>
					</div>
					<div className="flex flex-col items-center text-center">
						<p className="text-3xl font-bold text-green-600 dark:text-green-500 mb-1.5">{reviewedCount}</p>
						<p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-500">
							Reviewed
						</p>
					</div>
					<div className="flex flex-col items-center text-center">
						<p className={`text-3xl font-bold mb-1.5 ${backlog > 0 ? "text-orange-500" : "text-gray-900 dark:text-white"}`}>+{backlog}</p>
						<p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-500">
							Backlog
						</p>
					</div>
				</CardContent>
			</Card>

			<div className="flex flex-col md:flex-row gap-6 relative items-start">
				<div 
                   className={`transition-[width] ease-[cubic-bezier(0.16,1,0.3,1)] w-full ${selectedId ? "duration-500 md:w-[40%]" : "duration-0 transition-none md:w-full"}`}
                   style={{ willChange: "width" }}
                >
					<ul className="space-y-4">
						{problems.length > 0 ? (
							problems.map((problem) => (
								<ProblemReviewCard
									key={problem.id}
									problem={problem}
                                    isSelected={selectedId === problem.id}
                                    isCompressed={!!selectedId}
                                    onSelect={() => setSelectedId(selectedId === problem.id ? null : problem.id)}
									onUpdate={handleProblemUpdate}
								/>
							))
						) : (
							<div className="text-center py-16">
								<h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
									All Done for Today!
								</h2>
								<p className="text-gray-600 dark:text-gray-400 mt-2">
									You&apos;ve reviewed {reviewedCount} problem(s)
									today. Come back tomorrow for more!
								</p>
							</div>
						)}
					</ul>
				</div>
                
				{/* Desktop Detail Panel (Side-by-Side Slide in) */}
				<AnimatePresence>
					{selectedProblem && (
						<motion.div
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, transition: { duration: 0 } }}
							transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
							className="hidden md:block sticky top-24 h-[calc(100vh-120px)] flex-1 min-w-[500px] overflow-hidden rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] backdrop-blur-3xl shadow-2xl relative"
							style={{ willChange: "transform, opacity", boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 24px 48px -12px rgba(0,0,0,0.5)" }}
						>
							<div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent mix-blend-overlay z-20 pointer-events-none" />
                            <div className="w-full h-full overflow-y-auto overflow-x-hidden">
							    <ProblemDetailPanel
								    problem={selectedProblem}
								    onClose={() => setSelectedId(null)}
								    onUpdate={(id, updates) => handleProblemUpdate(id, updates, false)}
							    />
                            </div>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Mobile Bottom Sheet Overlay */}
				<AnimatePresence>
					{selectedProblem && (
						<>
							{/* Backdrop */}
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0, transition: { duration: 0 } }}
								onClick={() => setSelectedId(null)}
								className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
							/>
							{/* Bottom Sheet Modal */}
							<motion.div
								initial={{ y: "100%" }}
								animate={{ y: 0 }}
								exit={{ y: "100%", transition: { duration: 0 } }}
								transition={{ type: "spring", damping: 26, stiffness: 300 }}
								className="fixed bottom-0 left-0 right-0 z-50 h-[92vh] bg-white dark:bg-white/[0.04] border-t border-gray-200 dark:border-white/[0.08] rounded-t-[32px] shadow-2xl md:hidden overflow-hidden flex flex-col pt-3 backdrop-blur-2xl"
                                style={{ willChange: "transform" }}
							>
								<div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.1] to-transparent mix-blend-overlay z-20 pointer-events-none" />
								{/* Pull Handle Indicator */}
								<div className="w-full flex justify-center pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing">
									<div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700/80 rounded-full" />
								</div>
								
								<div className="w-full flex-1 overflow-y-auto">
									<ProblemDetailPanel
										problem={selectedProblem}
										onClose={() => setSelectedId(null)}
										onUpdate={(id, updates) => handleProblemUpdate(id, updates, false)}
									/>
								</div>
							</motion.div>
						</>
					)}
				</AnimatePresence>
			</div>
		</div>
	)
}
