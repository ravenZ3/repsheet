"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeClassNames from "rehype-class-names"
import { Light as SyntaxHighlighter } from "react-syntax-highlighter"
import cpp from "react-syntax-highlighter/dist/esm/languages/hljs/cpp"
import python from "react-syntax-highlighter/dist/esm/languages/hljs/python"
import java from "react-syntax-highlighter/dist/esm/languages/hljs/java"
import javascript from "react-syntax-highlighter/dist/esm/languages/hljs/javascript"
import { githubGist, stackoverflowDark } from "react-syntax-highlighter/dist/esm/styles/hljs"
import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import debounce from "lodash.debounce"
SyntaxHighlighter.registerLanguage("cpp", cpp)
SyntaxHighlighter.registerLanguage("c++", cpp)
SyntaxHighlighter.registerLanguage("python", python)
SyntaxHighlighter.registerLanguage("java", java)
SyntaxHighlighter.registerLanguage("javascript", javascript)
SyntaxHighlighter.registerLanguage("js", javascript)
import { Button } from "@/components/ui/button"
import { Loader2, XIcon, LayoutPanelLeft, SaveIcon, Activity, Check } from "lucide-react"
import { toast } from "sonner"
import type { Problem } from "@prisma/client"
import { ResponsiveContainer, LineChart, Line, YAxis, Tooltip } from "recharts"

interface ProblemDetailPanelProps {
    problem: Problem
    onClose: () => void
    onUpdate: (id: string, updates: Partial<Problem>) => void
}

const MD_CLASSES = {
    h1: "text-xl font-bold mb-3",
    h2: "text-lg font-semibold mb-2",
    h3: "text-base font-semibold mb-2",
    p: "mb-2.5 text-[13px] leading-relaxed text-gray-800 dark:text-[rgba(255,255,255,0.8)]",
    ul: "list-disc pl-4 mb-2.5 space-y-1",
    ol: "list-decimal pl-4 mb-2.5 space-y-1",
    li: "text-[13px] text-gray-800 dark:text-[rgba(255,255,255,0.8)]",
    blockquote: "border-l-2 border-gray-200 dark:border-white/[0.1] pl-3 italic mb-2.5 text-gray-500 dark:text-[#888]",
    strong: "font-semibold text-gray-900 dark:text-white",
    em: "italic",
}

function MarkdownContent({ content }: { content: string | null }) {
    const [isDark, setIsDark] = useState(false)
    useEffect(() => {
        const check = () => setIsDark(document.documentElement.classList.contains("dark"))
        check()
        const observer = new MutationObserver(check)
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
        return () => observer.disconnect()
    }, [])
    return (
        <div style={{ fontFeatureSettings: '"liga" 1, "kern" 1, "calt" 0' }}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[[rehypeClassNames, MD_CLASSES]]}
                components={{
                    code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || "")
                        const code = String(children).replace(/\n$/, "")
                        const isBlock = code.includes("\n") || match
                        if (!isBlock) {
                            return <code className="bg-gray-100 dark:bg-white/[0.06] px-1 py-0.5 rounded text-[12px] [font-family:var(--font-fira-code)] [font-variant-ligatures:none]" {...props}>{children}</code>
                        }
                        return (
                            <SyntaxHighlighter
                                language={match?.[1] || "cpp"}
                                style={isDark ? stackoverflowDark : githubGist}
                                customStyle={{
                                    margin: "0 0 12px 0",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                    fontFamily: "var(--font-fira-code)",
                                    fontVariantLigatures: "none",
                                    border: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #e5e7eb",
                                    overflowX: "auto",
                                }}
                            >
                                {code}
                            </SyntaxHighlighter>
                        )
                    },
                }}
            >
                {content || "*Nothing here yet.*"}
            </ReactMarkdown>
        </div>
    )
}

export default function ProblemDetailPanel({ problem, onClose, onUpdate }: ProblemDetailPanelProps) {
    const [notesMode, setNotesMode] = useState<"view" | "edit">("view")
    const [editNotes, setEditNotes] = useState(problem.notes || "")
    const [editMistakes, setEditMistakes] = useState(problem.mistakesMade || "")
    const [savingNotes, setSavingNotes] = useState(false)

    // Tracks the last value we know the server has (either from the initial
    // load or from our own successful save), so we can tell apart "the prop
    // changed because of our own round-trip" from "the prop changed because
    // we switched problems / someone else updated it elsewhere".
    const lastSyncedRef = useRef({ notes: problem.notes || "", mistakes: problem.mistakesMade || "" })

    useEffect(() => {
        const serverNotes = problem.notes || ""
        const serverMistakes = problem.mistakesMade || ""
        const synced = lastSyncedRef.current

        // Only overwrite local edits if they still match what we last synced,
        // i.e. the user hasn't typed anything new since then. Otherwise we'd
        // clobber in-flight edits with the value we just saved/echoed back.
        setEditNotes((current) => (current === synced.notes ? serverNotes : current))
        setEditMistakes((current) => (current === synced.mistakes ? serverMistakes : current))

        lastSyncedRef.current = { notes: serverNotes, mistakes: serverMistakes }
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

    const saveNotes = useCallback(async (notes: string, mistakes: string) => {
        setSavingNotes(true)
        try {
            const res = await fetch(`/api/problem/${problem.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes, mistakesMade: mistakes }),
            })
            if (!res.ok) throw new Error("Failed to save notes")
            const updated = await res.json()
            onUpdate(problem.id, updated)
        } catch {
            toast.error("Failed to save notes")
        } finally {
            setSavingNotes(false)
        }
    }, [problem.id, onUpdate])

    const debouncedSave = useMemo(
        () => debounce((notes: string, mistakes: string) => saveNotes(notes, mistakes), 2000),
        [saveNotes]
    )

    useEffect(() => {
        if (editNotes !== (problem.notes || "") || editMistakes !== (problem.mistakesMade || "")) {
            // lodash debounce resets its own timer on each call, so no
            // explicit cancel is needed (and would race the flush-on-teardown
            // effect below, turning it into a no-op).
            debouncedSave(editNotes, editMistakes)
        }
    }, [editNotes, editMistakes, debouncedSave])

    // Flush any pending save before we navigate away from this problem (or
    // unmount), so in-flight edits aren't silently dropped by the cancel above.
    useEffect(() => {
        return () => {
            debouncedSave.flush()
        }
    }, [debouncedSave])

    const handleSaveNotes = async () => {
        debouncedSave.cancel()
        await saveNotes(editNotes, editMistakes)
        setNotesMode("view")
    }

    return (
        <div className="flex flex-col h-full w-full bg-white dark:bg-[#0a0a0a] relative text-[14px]">
            {/* Header Sticky Strip */}
            <div className="sticky top-0 z-10 flex-shrink-0 p-5 md:p-6 border-b border-gray-100 dark:border-white/[0.05] flex flex-row items-center justify-between dark:bg-[#0a0a0a]/80 bg-white/80 backdrop-blur-xl">
                <div className="flex items-center gap-3 min-w-0">
                    <LayoutPanelLeft className="w-4 h-4 text-gray-400 dark:text-[#666] shrink-0" strokeWidth={2} />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight m-0 line-clamp-1">
                        {problem.name}
                    </h2>
                    {savingNotes
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500 shrink-0" />
                        : null}
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex bg-gray-100 dark:bg-white/[0.05] rounded-xl p-1 border border-transparent dark:border-white/[0.05]">
                        <button
                            className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md transition-all ${notesMode === 'view' ? 'bg-white dark:bg-white/[0.1] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-[#666] hover:text-gray-700 dark:hover:text-white'}`}
                            onClick={() => setNotesMode('view')}
                        >
                            Preview
                        </button>
                        <button
                            className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md transition-all ${notesMode === 'edit' ? 'bg-white dark:bg-white/[0.1] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-[#666] hover:text-gray-700 dark:hover:text-white'}`}
                            onClick={() => setNotesMode('edit')}
                        >
                            Edit
                        </button>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/[0.1] text-gray-400 dark:text-[#666] transition-colors">
                        <XIcon className="w-5 h-5" strokeWidth={2} />
                    </button>
                </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-auto p-6 md:p-10 pb-32">
                {notesMode === "view" ? (
                    <div className="max-w-3xl mx-auto flex flex-col gap-10 min-w-0 overflow-hidden">
                        <section className="space-y-4">
                            <h3 className="text-[15px] text-gray-400 dark:text-[#555] [font-family:var(--font-merriweather)]">
                                Documentation
                            </h3>
                            <div className="pl-5 border-l-2 border-gray-100 dark:border-white/[0.03]">
                                <MarkdownContent content={editNotes} />
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-[15px] text-gray-400 dark:text-[#555] [font-family:var(--font-merriweather)]">
                                Mistakes Made
                            </h3>
                            <div className="pl-5 border-l-2 border-gray-100 dark:border-white/[0.03]">
                                <MarkdownContent content={editMistakes} />
                            </div>
                        </section>

                        {problem.stability !== null && problem.lastReview && (
                            <div className="mt-8 pt-10 border-t border-gray-100 dark:border-white/[0.05]">
                                <div className="bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.05] rounded-3xl p-6 shadow-sm flex flex-col gap-6">
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <h3 className="font-bold text-[11px] text-gray-400 dark:text-[#555] tracking-widest uppercase flex items-center gap-2">
                                                <Activity className="w-3.5 h-3.5 text-blue-500" /> Retention Curve
                                            </h3>
                                            <p className="text-[11px] text-[#888] font-medium tracking-wide">STABILITY: {problem.stability.toFixed(2)} DAYS</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-4xl font-light tracking-tighter text-gray-900 dark:text-white">
                                                {getRetrievability(problem.lastReview, problem.stability)}%
                                            </span>
                                            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">Probability</p>
                                        </div>
                                    </div>
                                    
                                    <div className="h-[60px] w-full bg-white/50 dark:bg-black/20 rounded-2xl p-4 border border-transparent dark:border-white/[0.02]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={curveData}>
                                                <YAxis domain={[0, 100]} hide />
                                                <Tooltip
                                                    cursor={{ stroke: 'rgba(255,255,255,0.05)' }}
                                                    contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                                                    itemStyle={{ color: '#3b82f6' }}
                                                    labelStyle={{ display: 'none' }}
                                                    formatter={(val: number) => [`${val}%`, 'Retention']}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="retention"
                                                    stroke="#3b82f6"
                                                    strokeWidth={2.5}
                                                    dot={false}
                                                    activeDot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-[#888] font-bold uppercase tracking-widest px-2">
                                        <span>Today</span>
                                        <span>+30 Days</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-6 h-full">
                        <div className="space-y-2 flex flex-col flex-1 min-h-[250px]">
                            <label className="text-[15px] text-gray-400 dark:text-[#555] [font-family:var(--font-merriweather)]">Documentation</label>
                            <textarea
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                className="w-full flex-1 p-4 text-[13px] leading-relaxed rounded-xl border border-gray-200 dark:border-white/[0.06] bg-gray-50/50 dark:bg-white/[0.02] text-gray-900 dark:text-[rgba(255,255,255,0.9)] focus:border-gray-400 dark:focus:border-white/[0.2] outline-none resize-none font-mono transition-colors"
                                placeholder="Jot down logic blocks, optimal structures, algorithms used..."
                            />
                        </div>
                        <div className="space-y-2 flex flex-col flex-1 min-h-[250px]">
                            <label className="text-[15px] text-gray-400 dark:text-[#555] [font-family:var(--font-merriweather)]">Mistakes Made</label>
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
