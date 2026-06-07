"use client"

import { useState, useCallback } from "react"
import { Star, FileText, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { type Problem, Difficulty } from "@prisma/client"

interface ProblemCardProps {
    problem: Problem
    isSelected: boolean
    onSelect: (id: string) => void
    onUpdate: (id: string, updates: Partial<Problem> | null) => void
}

export default function ProblemCard({ problem, isSelected, onSelect, onUpdate }: ProblemCardProps) {
    const [isStarred, setIsStarred] = useState(problem.isStarred)

    const difficultyColor: Record<string, string> = {
        Easy: "text-green-600 dark:text-green-400",
        Medium: "text-yellow-600 dark:text-yellow-400",
        Hard: "text-red-600 dark:text-red-400",
    }

    const getFsrsLine = () => {
        const parts: string[] = []
        if (problem.reviewCount && problem.reviewCount > 0) {
            parts.push(`${problem.reviewCount} review${problem.reviewCount === 1 ? "" : "s"}`)
        }
        if (problem.nextReviewDate) {
            const diffDays = Math.ceil((new Date(problem.nextReviewDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            if (diffDays < 0) parts.push("overdue")
            else if (diffDays === 0) parts.push("due today")
            else if (diffDays === 1) parts.push("due tomorrow")
            else parts.push(`due in ${diffDays}d`)
        } else if (problem.lastReview) {
            const diffDays = Math.floor((Date.now() - new Date(problem.lastReview).getTime()) / (1000 * 60 * 60 * 24))
            if (diffDays === 0) parts.push("reviewed today")
            else parts.push(`last reviewed ${diffDays}d ago`)
        }
        return parts.join(" · ")
    }

    const handleStarToggle = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation()
        const newVal = !isStarred
        setIsStarred(newVal)
        try {
            const res = await fetch(`/api/problem/${problem.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isStarred: newVal }),
            })
            if (!res.ok) throw new Error(await res.text())
            onUpdate(problem.id, await res.json())
        } catch {
            setIsStarred(!newVal)
            toast.error("Failed to update star")
        }
    }, [isStarred, problem.id, onUpdate])

    const fsrsLine = getFsrsLine()

    return (
        <div
            onClick={() => onSelect(problem.id)}
            className={`flex items-center justify-between px-4 py-3 rounded-[10px] cursor-pointer transition-all border ${
                isSelected
                    ? "bg-white dark:bg-white/[0.06] border-gray-300 dark:border-white/[0.15] shadow-sm"
                    : "bg-transparent border-transparent hover:bg-white/60 dark:hover:bg-white/[0.03] hover:border-gray-200/50 dark:hover:border-white/[0.06]"
            }`}
        >
            <div className="flex-1 min-w-0 pr-3">
                <p className={`text-[14px] font-medium truncate leading-snug ${
                    isSelected ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-200"
                }`}>
                    {problem.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {problem.platform && (
                        <span className="text-[11px] text-gray-400 dark:text-[#666]">{problem.platform}</span>
                    )}
                    <span className={`text-[11px] font-medium ${difficultyColor[problem.difficulty] ?? "text-gray-500"}`}>
                        {problem.difficulty}
                    </span>
                    {problem.platformRating && (
                        <span className="text-[11px] font-mono text-[#2B73FF] dark:text-[#5F9CFF]">
                            {problem.platformRating}
                        </span>
                    )}
                    {problem.isStuck && (
                        <span className="relative flex h-2 w-2 items-center justify-center">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" style={{ animationDuration: "3s" }} />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                        </span>
                    )}
                </div>
                {fsrsLine && (
                    <p className="text-[10px] text-gray-400 dark:text-[#555] mt-0.5 font-medium tracking-wide">
                        {fsrsLine}
                    </p>
                )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
                {problem.notes && problem.notes.trim() && (
                    <span title="Has notes"><FileText className="w-3 h-3 text-gray-300 dark:text-[#444]" /></span>
                )}
                {problem.mistakesMade && problem.mistakesMade.trim() && (
                    <span title="Has mistakes logged"><AlertTriangle className="w-3 h-3 text-gray-300 dark:text-[#444]" /></span>
                )}
                <button
                    onClick={handleStarToggle}
                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                    title={isStarred ? "Unstar" : "Star"}
                >
                    <Star className={`w-3.5 h-3.5 transition-colors ${
                        isStarred ? "fill-yellow-400 text-yellow-400" : "text-gray-300 dark:text-[#444]"
                    }`} />
                </button>
            </div>
        </div>
    )
}
