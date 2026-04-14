"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeClassNames from "rehype-class-names"
import rehypeHighlight from "rehype-highlight"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, XIcon, LayoutPanelLeft, SaveIcon, Activity } from "lucide-react"
import { toast } from "sonner"
import type { Problem } from "@prisma/client"
import { ResponsiveContainer, LineChart, Line, YAxis, Tooltip } from "recharts"

interface ProblemDetailPanelProps {
    problem: Problem
    onClose: () => void
    onUpdate: (id: string, updates: Partial<Problem>) => void
}

const classNames = {
    h1: "text-xl font-bold mb-3",
    h2: "text-lg font-semibold mb-2",
    h3: "text-base font-semibold mb-2",
    p: "mb-2 text-sm leading-relaxed",
    ul: "list-disc pl-4 mb-2 space-y-1",
    ol: "list-decimal pl-4 mb-2 space-y-1",
    li: "text-sm text-gray-700 dark:text-gray-300",
    code: "bg-muted/30 px-1 py-0.5 rounded text-sm font-mono",
    pre: "bg-gray-100 dark:bg-[#1e293b] border dark:border-gray-800 p-4 rounded-lg text-xs font-mono overflow-x-auto mb-4",
    blockquote: "border-l-4 border-gray-300 dark:border-[#1e293b] pl-4 italic mb-2 text-gray-600 dark:text-gray-400",
    strong: "font-semibold text-gray-900 dark:text-white",
    em: "italic",
    del: "line-through",
    table: "w-full border-collapse border border-gray-200 dark:border-gray-800 mb-4 text-sm",
    thead: "bg-gray-50 dark:bg-gray-900",
    tr: "border-b border-gray-200 dark:border-gray-800",
    th: "border border-gray-200 dark:border-gray-800 p-2 text-left font-semibold",
    td: "border border-gray-200 dark:border-gray-800 p-2",
}

const MarkdownContent = ({ content }: { content: string | null }) => (
    <div className="markdown-content">
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[
                [rehypeHighlight, { ignoreMissing: true }],
                [rehypeClassNames, classNames],
            ]}
        >
            {content || "*No content available.*"}
        </ReactMarkdown>
    </div>
)

export default function ProblemDetailPanel({ problem, onClose, onUpdate }: ProblemDetailPanelProps) {
    const [notesMode, setNotesMode] = useState<"view" | "edit">("view")
    const [editNotes, setEditNotes] = useState(problem.notes || "")
    const [editMistakes, setEditMistakes] = useState(problem.mistakesMade || "")
    const [savingNotes, setSavingNotes] = useState(false)

    useEffect(() => {
        setEditNotes(problem.notes || "")
        setEditMistakes(problem.mistakesMade || "")
    }, [problem.notes, problem.mistakesMade, problem.id])

    const getRetrievability = (lastReview: Date, stability: number) => {
        const elapsedDays = (new Date().getTime() - new Date(lastReview).getTime()) / (1000 * 60 * 60 * 24);
        return Math.round(Math.pow(1 + elapsedDays / (9 * stability), -1) * 100);
    }

    const getCurveData = () => {
        if (!problem.lastReview || !problem.stability) return [];
        const data = [];
        const lastRevTime = new Date(problem.lastReview).getTime();
        const nowTime = new Date().getTime();
        const daysSinceReview = (nowTime - lastRevTime) / (1000 * 60 * 60 * 24);

        for (let i = 0; i <= 30; i += 2) {
            const t = daysSinceReview + i;
            const r = Math.pow(1 + t / (9 * problem.stability), -1);
            data.push({
                day: `Day ${Math.floor(t)}`,
                retention: Math.round(r * 100)
            });
        }
        return data;
    }

    const curveData = getCurveData();

    const handleSaveNotes = async () => {
        setSavingNotes(true)
        try {
            const res = await fetch(`/api/problem/${problem.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    notes: editNotes,
                    mistakesMade: editMistakes,
                }),
            })
            if (!res.ok) throw new Error("Failed to save notes")
            const updated = await res.json()
            toast.success("Notes saved successfully")
            onUpdate(problem.id, updated)
            setNotesMode("view")
        } catch {
            toast.error("Failed to save notes")
        } finally {
            setSavingNotes(false)
        }
    }

    return (
        <div className="flex flex-col h-full w-full bg-white dark:bg-[#151515] relative text-[13px]">
            {/* Header Sticky Strip */}
            <div className="sticky top-0 z-10 flex-shrink-0 p-5 md:p-6 border-b border-gray-100 dark:border-white/[0.08] flex flex-row items-center justify-between dark:bg-[#1a1a1a] bg-white/80 dark:backdrop-blur-none backdrop-blur-3xl">
                <div className="flex items-center gap-3">
                    <LayoutPanelLeft className="w-4 h-4 text-gray-400 dark:text-[#888]" strokeWidth={2} />
                    <h2 className="text-base font-medium text-gray-900 dark:text-[rgba(255,255,255,0.9)] tracking-tight m-0 line-clamp-1">
                        {problem.name}
                    </h2>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex bg-gray-100 dark:bg-white/[0.04] rounded-lg p-0.5 border border-transparent dark:border-white/[0.04]">
                        <button
                            className={`px-4 py-1.5 text-[12px] font-medium rounded-md transition-all ${notesMode === 'view' ? 'bg-white dark:bg-white/[0.08] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-[#888] hover:text-gray-700 dark:hover:text-[rgba(255,255,255,0.9)]'}`}
                            onClick={() => setNotesMode('view')}
                        >
                            Preview
                        </button>
                        <button
                            className={`px-4 py-1.5 text-[12px] font-medium rounded-md transition-all ${notesMode === 'edit' ? 'bg-white dark:bg-white/[0.08] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-[#888] hover:text-gray-700 dark:hover:text-[rgba(255,255,255,0.9)]'}`}
                            onClick={() => setNotesMode('edit')}
                        >
                            Edit
                        </button>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/[0.1] text-gray-400 dark:text-[#888] transition-colors">
                        <XIcon className="w-4 h-4" strokeWidth={2} />
                    </button>
                </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-auto p-5 md:p-6 pb-24">
                {notesMode === "view" ? (
                    <div className="flex flex-col gap-6">
                        <div className="space-y-3">
                            <h3 className="font-semibold text-[13px] text-gray-400 dark:text-[#888] tracking-wide flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[rgba(255,255,255,0.4)]" /> Documentation
                            </h3>
                            <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none text-gray-700 dark:text-[rgba(255,255,255,0.7)] p-2">
                                <MarkdownContent content={editNotes} />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h3 className="font-semibold text-[13px] text-gray-400 dark:text-[#888] tracking-wide flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500/60" /> Mistakes Made
                            </h3>
                            <div className="prose prose-sm prose-slate dark:prose-invert max-w-none text-red-900 dark:text-rose-100/70 p-2">
                                <MarkdownContent content={editMistakes} />
                            </div>
                        </div>

                        {problem.stability !== null && problem.lastReview && (
                            <div className="bg-[#111] border border-white/[0.05] rounded-xl p-4 shadow-md flex flex-col gap-3">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-semibold text-[12px] text-gray-400 dark:text-[#888] tracking-wide flex items-center gap-2">
                                        <Activity className="w-3.5 h-3.5 text-emerald-400" /> Exact Memory Probability
                                    </h3>
                                    <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                                        {getRetrievability(problem.lastReview, problem.stability)}%
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-[#555] font-semibold tracking-wider">
                                    <span>{getRetrievability(problem.lastReview, problem.stability)}% RETAINED</span>
                                    <span>STABILITY: {problem.stability.toFixed(2)}</span>
                                </div>
                                <div className="h-[40px] w-full mt-2 border-t border-white/[0.03] pt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={curveData}>
                                            <YAxis domain={[0, 100]} hide />
                                            <Tooltip
                                                cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
                                                contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                                                itemStyle={{ color: '#10b981' }}
                                                labelStyle={{ color: '#888' }}
                                                formatter={(val: number) => [`${val}%`, 'Retention']}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="retention"
                                                stroke="#3b82f6"
                                                strokeWidth={2}
                                                dot={false}
                                                activeDot={{ r: 4, fill: '#10b981', stroke: '#111', strokeWidth: 2 }}
                                                animationDuration={1500}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex justify-between text-[9px] text-[#444] uppercase tracking-widest font-semibold">
                                    <span>Today</span>
                                    <span>+30 Days</span>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-6 h-full">
                        <div className="space-y-2 flex flex-col flex-1 min-h-[250px]">
                            <label className="font-semibold text-[13px] text-gray-400 dark:text-[#888] tracking-wide flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[rgba(255,255,255,0.4)]" /> Documentation (Markdown)
                            </label>
                            <textarea
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                className="w-full flex-1 p-4 text-[13px] leading-relaxed rounded-xl border border-gray-200 dark:border-white/[0.06] bg-gray-50/50 dark:bg-white/[0.02] text-gray-900 dark:text-[rgba(255,255,255,0.9)] focus:border-gray-400 dark:focus:border-white/[0.2] outline-none resize-none font-mono transition-colors"
                                placeholder="Jot down logic blocks, optimal structures, algorithms used..."
                            />
                        </div>
                        <div className="space-y-2 flex flex-col flex-1 min-h-[250px]">
                            <label className="font-semibold text-[13px] text-gray-400 dark:text-[#888] tracking-wide flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500/80" /> Mistakes (Markdown)
                            </label>
                            <textarea
                                value={editMistakes}
                                onChange={(e) => setEditMistakes(e.target.value)}
                                className="w-full flex-1 p-4 text-[13px] leading-relaxed rounded-xl border border-red-200 dark:border-rose-500/[0.15] bg-red-50/50 dark:bg-rose-500/[0.02] text-red-900 dark:text-rose-200/80 focus:border-red-400 dark:focus:border-rose-500/[0.3] outline-none resize-none font-mono transition-colors"
                                placeholder="What went wrong? Edge cases missed..."
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Sticky Action Footer */}
            {notesMode === "edit" && (
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-white/[0.08] flex justify-end gap-3 bg-white dark:bg-white/[0.02] backdrop-blur-3xl z-20">
                    <Button variant="outline" className="w-[100px] border-gray-200 dark:border-white/[0.1] dark:bg-transparent dark:text-[#888] dark:hover:text-white dark:hover:bg-white/[0.05] h-8 text-[12px]" onClick={() => setNotesMode("view")}>Cancel</Button>
                    <Button onClick={handleSaveNotes} disabled={savingNotes} className="bg-gray-900 text-white hover:bg-black dark:bg-[#fff] dark:text-black dark:hover:bg-white/90 shadow-sm transition-all active:scale-95 min-w-[130px] h-8 text-[12px] font-medium border-0">
                        {savingNotes ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <SaveIcon className="w-3.5 h-3.5 mr-2" />}
                        Save Workspace
                    </Button>
                </div>
            )}
        </div>
    )
}
