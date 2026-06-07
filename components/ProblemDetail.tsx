"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeClassNames from "rehype-class-names"
import { Light as SyntaxHighlighter } from "react-syntax-highlighter"
import cpp from "react-syntax-highlighter/dist/esm/languages/hljs/cpp"
import python from "react-syntax-highlighter/dist/esm/languages/hljs/python"
import java from "react-syntax-highlighter/dist/esm/languages/hljs/java"
import javascript from "react-syntax-highlighter/dist/esm/languages/hljs/javascript"
import { githubGist, stackoverflowDark } from "react-syntax-highlighter/dist/esm/styles/hljs"
SyntaxHighlighter.registerLanguage("cpp", cpp)
SyntaxHighlighter.registerLanguage("c++", cpp)
SyntaxHighlighter.registerLanguage("python", python)
SyntaxHighlighter.registerLanguage("java", java)
SyntaxHighlighter.registerLanguage("javascript", javascript)
SyntaxHighlighter.registerLanguage("js", javascript)
import {
    X, ExternalLink, Settings, Loader2, Check, AlertCircle,
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
import { toast } from "sonner"
import debounce from "lodash.debounce"
import { useRouter } from "next/navigation"
import { Difficulty, type Problem } from "@prisma/client"
import CategoryAutocomplete from "@/components/CategoryAutocomplete"

const DIFFICULTY_OPTIONS: Difficulty[] = [Difficulty.Easy, Difficulty.Medium, Difficulty.Hard]
const MAX_INPUT_LENGTH = 2000
const DEBOUNCE_DELAY = 2000

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

function MarkdownContent({ content }: { content: string }) {
    const [isDark, setIsDark] = useState(false)
    useEffect(() => {
        const check = () => setIsDark(document.documentElement.classList.contains("dark"))
        check()
        const observer = new MutationObserver(check)
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
        return () => observer.disconnect()
    }, [])

    return (
        <div style={{ fontFeatureSettings: '"liga" 1, "kern" 1, "calt" 0', overflowWrap: "anywhere", wordBreak: "break-word", minWidth: 0 }}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[[rehypeClassNames, MD_CLASSES]]}
                components={{
                    code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || "")
                        const code = String(children).replace(/\n$/, "")
                        const isBlock = code.includes("\n") || match
                        if (!isBlock) {
                            return (
                                <code className="bg-gray-100 dark:bg-white/[0.06] px-1 py-0.5 rounded text-[12px] [font-family:var(--font-fira-code)] [font-variant-ligatures:none]" {...props}>
                                    {children}
                                </code>
                            )
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

interface EditableForm {
    notes: string
    mistakesMade: string
}

interface SettingsForm {
    name: string
    platform: string
    difficulty: Difficulty
    isStuck: boolean
    category: string
}

interface ProblemDetailProps {
    problem: Problem
    onUpdate: (id: string, updates: Partial<Problem> | null) => void
    onClose: () => void
}

export default function ProblemDetail({ problem, onUpdate, onClose }: ProblemDetailProps) {
    const router = useRouter()
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [notesMode, setNotesMode] = useState<"view" | "edit">("view")

    const getAdaptiveSplit = (notes: string, mistakes: string) => {
        const hasNotes = notes.trim().length > 0
        const hasMistakes = mistakes.trim().length > 0
        if (!hasMistakes) return 70
        if (!hasNotes) return 30
        return 60
    }
    const [splitPct, setSplitPct] = useState(() => getAdaptiveSplit(problem.notes || "", problem.mistakesMade || ""))
    const [isDesktop, setIsDesktop] = useState(false)
    useEffect(() => {
        const check = () => setIsDesktop(window.innerWidth >= 640)
        check()
        window.addEventListener("resize", check)
        return () => window.removeEventListener("resize", check)
    }, [])
    const workspaceRef = useRef<HTMLDivElement>(null)
    const isDragging = useRef(false)

    const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        isDragging.current = true
        const onMove = (ev: MouseEvent) => {
            if (!isDragging.current || !workspaceRef.current) return
            const rect = workspaceRef.current.getBoundingClientRect()
            const pct = ((ev.clientX - rect.left) / rect.width) * 100
            setSplitPct(Math.min(70, Math.max(30, pct)))
        }
        const onUp = () => {
            isDragging.current = false
            document.removeEventListener("mousemove", onMove)
            document.removeEventListener("mouseup", onUp)
        }
        document.addEventListener("mousemove", onMove)
        document.addEventListener("mouseup", onUp)
    }, [])
    const [editableForm, setEditableForm] = useState<EditableForm>({
        notes: problem.notes || "",
        mistakesMade: problem.mistakesMade || "",
    })
    const [settingsForm, setSettingsForm] = useState<SettingsForm>({
        name: problem.name,
        platform: problem.platform || "",
        difficulty: problem.difficulty,
        isStuck: problem.isStuck,
        category: problem.category.join(", "),
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [lastSaved, setLastSaved] = useState<Date | null>(null)
    const [settingsSaving, setSettingsSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)

    // Reset form when selected problem changes
    useEffect(() => {
        setEditableForm({
            notes: problem.notes || "",
            mistakesMade: problem.mistakesMade || "",
        })
        setSettingsForm({
            name: problem.name,
            platform: problem.platform || "",
            difficulty: problem.difficulty,
            isStuck: problem.isStuck,
            category: problem.category.join(", "),
        })
        setLastSaved(null)
        setError(null)
        setNotesMode("view")
    }, [problem.id])

    const saveChanges = useMemo(
        () =>
            debounce(async (updates: Partial<Problem>) => {
                if (!problem.id) return
                setSaving(true)
                setError(null)
                try {
                    const response = await fetch(`/api/problem/${problem.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(updates),
                    })
                    if (!response.ok) throw new Error(`Failed to save: ${response.statusText}`)
                    const updatedProblem: Problem = await response.json()
                    if (!updatedProblem?.id) throw new Error("Invalid response from server")
                    setLastSaved(new Date())
                    onUpdate(problem.id, updatedProblem)
                    if ("name" in updates) toast.success("Problem settings saved!")
                } catch (err) {
                    const msg = err instanceof Error ? err.message : "Failed to save changes"
                    setError(msg)
                    toast.error(msg)
                } finally {
                    setSaving(false)
                }
            }, DEBOUNCE_DELAY),
        [problem.id, onUpdate]
    )

    const savePendingChanges = useCallback(() => saveChanges.flush(), [saveChanges])

    const handleDelete = useCallback(async () => {
        if (!confirm(`Are you sure you want to delete "${problem.name}"?`)) return
        setDeleting(true)
        setError(null)
        try {
            saveChanges.cancel()
            const response = await fetch(`/api/review/delete`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: problem.id }),
            })
            if (!response.ok) throw new Error(`Failed to delete: ${response.statusText}`)
            onUpdate(problem.id, null)
            onClose()
            toast.success("Problem deleted successfully")
            router.refresh()
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to delete problem"
            setError(msg)
            toast.error(msg)
        } finally {
            setDeleting(false)
            setSettingsOpen(false)
        }
    }, [problem.id, problem.name, router, onUpdate, onClose, saveChanges])

    const handleEditableChange = useCallback((key: keyof EditableForm, value: string) => {
        setEditableForm((prev) => ({ ...prev, [key]: value.slice(0, MAX_INPUT_LENGTH) }))
        setError(null)
    }, [])

    const handleSettingsChange = useCallback(
        (key: keyof SettingsForm, value: string | Difficulty | boolean) => {
            setSettingsForm((prev) => ({ ...prev, [key]: value }))
            setError(null)
        },
        []
    )

    const handleSettingsSave = useCallback(async () => {
        if (!settingsForm.name.trim()) { setError("Problem name is required"); return }
        const categories = settingsForm.category.split(",").map((t) => t.trim()).filter(Boolean)
        if (categories.length === 0) { setError("At least one category is required"); return }
        setSettingsSaving(true)
        saveChanges.cancel()
        await saveChanges({ ...settingsForm, category: categories })
        saveChanges.flush()
        setSettingsSaving(false)
        setSettingsOpen(false)
        router.refresh()
    }, [settingsForm, saveChanges, router])

    const handleSettingsReset = useCallback(() => {
        setSettingsForm({
            name: problem.name,
            platform: problem.platform || "",
            difficulty: problem.difficulty,
            isStuck: problem.isStuck,
            category: problem.category.join(", "),
        })
        setError(null)
    }, [problem])

    useEffect(() => {
        const debouncedSave = debounce(() => {
            if (problem.notes !== editableForm.notes || problem.mistakesMade !== editableForm.mistakesMade) {
                saveChanges(editableForm)
            }
        }, DEBOUNCE_DELAY)
        debouncedSave()
        return () => debouncedSave.cancel()
    }, [editableForm, problem, saveChanges])

    const getFsrsContext = () => {
        const items: { label: string; value: string }[] = []
        if (problem.reviewCount != null && problem.reviewCount > 0) {
            items.push({ label: "Reviews", value: `${problem.reviewCount}` })
        }
        if (problem.lastReview) {
            const d = Math.floor((Date.now() - new Date(problem.lastReview).getTime()) / (1000 * 60 * 60 * 24))
            items.push({ label: "Last reviewed", value: d === 0 ? "Today" : `${d}d ago` })
        }
        if (problem.nextReviewDate) {
            const diffDays = Math.ceil((new Date(problem.nextReviewDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            const val = diffDays < 0 ? "Overdue" : diffDays === 0 ? "Today" : diffDays === 1 ? "Tomorrow" :
                new Date(problem.nextReviewDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            items.push({ label: "Next review", value: val })
        }
        return items
    }

    const fsrsItems = getFsrsContext()

    return (
        <div className="flex flex-col lg:h-full bg-white dark:bg-[#111] border border-gray-200 dark:border-white/[0.08] rounded-[16px] shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.06] gap-3">
                <div className="flex-1 min-w-0">
                    <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white leading-snug" title={problem.name}>
                        {problem.name}
                    </h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {problem.platform && (
                            <span className="text-[11px] text-gray-400 dark:text-[#666] whitespace-nowrap">{problem.platform}</span>
                        )}
                        {problem.platformRating && (
                            <span className="text-[11px] font-mono text-[#2B73FF] dark:text-[#5F9CFF] whitespace-nowrap">{problem.platformRating}</span>
                        )}
                        {problem.category.slice(0, 3).map((cat, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-white/[0.04] text-gray-500 dark:text-[#888] rounded-[4px] whitespace-nowrap">
                                {cat}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Preview / Edit toggle */}
                    <div className="flex bg-gray-100 dark:bg-white/[0.05] rounded-lg p-0.5 border border-transparent dark:border-white/[0.05]">
                        <button
                            onClick={() => setNotesMode("view")}
                            className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md transition-all ${notesMode === "view" ? "bg-white dark:bg-white/[0.1] text-gray-900 dark:text-white shadow-sm" : "text-gray-400 dark:text-[#666] hover:text-gray-700 dark:hover:text-white"}`}
                        >
                            Preview
                        </button>
                        <button
                            onClick={() => setNotesMode("edit")}
                            className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md transition-all ${notesMode === "edit" ? "bg-white dark:bg-white/[0.1] text-gray-900 dark:text-white shadow-sm" : "text-gray-400 dark:text-[#666] hover:text-gray-700 dark:hover:text-white"}`}
                        >
                            Edit
                        </button>
                    </div>
                    <AnimatePresence mode="wait">
                        {saving && <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" /></motion.div>}
                        {error && <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><AlertCircle className="w-3.5 h-3.5 text-red-500" /></motion.div>}
                        {lastSaved && !saving && !error && <motion.div key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Check className="w-3.5 h-3.5 text-green-500" /></motion.div>}
                    </AnimatePresence>
                    {problem.link && (
                        <a href={problem.link} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                            title="Open problem">
                            <ExternalLink className="w-3.5 h-3.5 text-gray-400 dark:text-[#666]" />
                        </a>
                    )}
                    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                        <DialogTrigger asChild>
                            <button className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors" title="Settings">
                                <Settings className="w-3.5 h-3.5 text-gray-400 dark:text-[#666]" />
                            </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md bg-white dark:bg-[#111] border border-gray-200 dark:border-white/[0.08] shadow-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="text-[15px] font-medium">Problem Settings</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Name <span className="text-red-500">*</span></label>
                                    <Input value={settingsForm.name} onChange={(e) => handleSettingsChange("name", e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Platform</label>
                                    <Input value={settingsForm.platform} onChange={(e) => handleSettingsChange("platform", e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Difficulty</label>
                                    <Select value={settingsForm.difficulty} onValueChange={(v: Difficulty) => handleSettingsChange("difficulty", v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {DIFFICULTY_OPTIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                                    <button
                                        type="button"
                                        onClick={() => handleSettingsChange("isStuck", !settingsForm.isStuck)}
                                        className={`w-full py-2 px-4 rounded-md font-medium text-sm transition-all ${
                                            settingsForm.isStuck
                                                ? "bg-red-500 text-white hover:bg-red-600"
                                                : "bg-green-100/50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-500 outline-dashed outline-1 outline-green-400 dark:outline-green-600"
                                        }`}
                                    >
                                        {settingsForm.isStuck ? "Stuck" : "Stuck?"}
                                    </button>
                                </div>
                                <CategoryAutocomplete
                                    id="detail-category"
                                    value={settingsForm.category}
                                    onChange={(value) => handleSettingsChange("category", value)}
                                />
                                {error && <p className="text-sm text-red-500">{error}</p>}
                            </div>
                            <div className="flex justify-end gap-2 pt-6">
                                <Button variant="destructive" onClick={handleDelete} disabled={deleting || settingsSaving}>
                                    {deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</> : "Delete"}
                                </Button>
                                <Button variant="outline" onClick={handleSettingsReset}>Reset</Button>
                                <Button onClick={handleSettingsSave} disabled={settingsSaving || deleting}>
                                    {settingsSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                    <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors" title="Close">
                        <X className="w-3.5 h-3.5 text-gray-400 dark:text-[#666]" />
                    </button>
                </div>
            </div>

            {/* FSRS context */}
            {fsrsItems.length > 0 && (
                <div className="flex flex-wrap gap-x-5 gap-y-1 px-5 py-3 border-b border-gray-100 dark:border-white/[0.04] bg-gray-50/50 dark:bg-white/[0.01]">
                    {fsrsItems.map((item) => (
                        <span key={item.label} className="text-[11px] text-gray-400 dark:text-[#666]">
                            {item.label}: <span className="font-medium text-gray-600 dark:text-[#999]">{item.value}</span>
                        </span>
                    ))}
                </div>
            )}

            {/* Workspace */}
            <div ref={workspaceRef} className="flex flex-col lg:flex-row lg:flex-1 lg:min-h-0 min-w-0 overflow-hidden">
                {/* Notes panel */}
                <div
                    style={isDesktop ? { width: `${splitPct}%`, maxWidth: `${splitPct}%`, flexShrink: 0, flexGrow: 0, overflow: "hidden" } : undefined}
                    className="flex flex-col p-5 overflow-y-auto w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                >
                    <label className="text-[14px] text-gray-200 dark:text-[#555] shrink-0 mb-3 [font-family:var(--font-slabo)]">Notes</label>
                    {notesMode === "view" ? (
                        <div className="pl-3 border-l border-gray-100 dark:border-white/[0.04] overflow-x-auto break-words">
                            <MarkdownContent content={editableForm.notes} />
                        </div>
                    ) : (
                        <Textarea
                            value={editableForm.notes}
                            onChange={(e) => handleEditableChange("notes", e.target.value)}
                            onBlur={savePendingChanges}
                            placeholder="What did you learn? Key insights, patterns..."
                            className="flex-1 text-[13px] resize-none bg-transparent border-0 focus:ring-0 p-0 shadow-none min-h-[120px] font-mono"
                        />
                    )}
                </div>

                {/* Divider — desktop only */}
                <div
                    onMouseDown={handleDividerMouseDown}
                    className="hidden lg:block w-px bg-gray-100 dark:bg-white/[0.05] hover:bg-gray-300 dark:hover:bg-white/[0.15] cursor-col-resize shrink-0 transition-colors relative"
                >
                    <div className="absolute inset-y-0 -left-2 -right-2" />
                </div>

                {/* Mobile separator */}
                <div className="lg:hidden h-px bg-gray-100 dark:bg-white/[0.05] shrink-0 mx-5" />

                {/* Mistakes panel */}
                <div className="flex flex-col p-5 flex-1 min-w-0 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <label className="text-[14px] text-gray-200 dark:text-[#555] shrink-0 mb-3 [font-family:var(--font-slabo)]">Mistakes</label>
                    {notesMode === "view" ? (
                        <div className="pl-3 border-l border-gray-100 dark:border-white/[0.04] break-words min-w-0">
                            <MarkdownContent content={editableForm.mistakesMade} />
                        </div>
                    ) : (
                        <Textarea
                            value={editableForm.mistakesMade}
                            onChange={(e) => handleEditableChange("mistakesMade", e.target.value)}
                            onBlur={savePendingChanges}
                            placeholder="What went wrong? Edge cases missed, wrong approach..."
                            className="flex-1 text-[13px] resize-none bg-transparent border-0 focus:ring-0 p-0 shadow-none min-h-[120px] font-mono"
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
