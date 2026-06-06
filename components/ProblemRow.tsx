"use client"

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import {
	ChevronDown,
	Check,
	AlertCircle,
	Loader2,
	Settings,
	Star,
	FileText,
	AlertTriangle,
} from "lucide-react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select"
import { toast } from "sonner"
import debounce from "lodash.debounce"
import { useRouter } from "next/navigation"
import { Difficulty, type Problem } from "@prisma/client"
import CategoryAutocomplete from "@/components/CategoryAutocomplete"

// --- Constants for Configuration ---
const DIFFICULTY_OPTIONS: Difficulty[] = [
	Difficulty.Easy,
	Difficulty.Medium,
	Difficulty.Hard,
]

const MAX_INPUT_LENGTH = 2000
const DEBOUNCE_DELAY = 2000 // Increased to 5 seconds for a better UX

// --- Type Definitions ---
interface ProblemRowProps {
	problem: Problem
	onUpdate?: (id: string, updates: Partial<Problem> | null) => void
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

/**
 * A highly interactive and feature-rich component to display, edit, and manage a single problem.
 * Features include collapsible notes, a settings dialog, and debounced autosaving.
 */
export default function ProblemRow({ problem, onUpdate }: ProblemRowProps) {
	const router = useRouter()
	const [open, setOpen] = useState(false)
	const [settingsOpen, setSettingsOpen] = useState(false)
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
	const [isStarred, setIsStarred] = useState(problem.isStarred)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [lastSaved, setLastSaved] = useState<Date | null>(null)
	const [settingsSaving, setSettingsSaving] = useState(false)
	const [deleting, setDeleting] = useState(false)

	// --- Memoized Styles for Performance ---

	const difficultyStyle = useMemo(() => {
		switch (problem.difficulty) {
			case Difficulty.Easy:
				return {
					color: "text-green-600 dark:text-green-400",
					bg: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700",
				}
			case Difficulty.Medium:
				return {
					color: "text-yellow-600 dark:text-yellow-400",
					bg: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700",
				}
			case Difficulty.Hard:
				return {
					color: "text-red-600 dark:text-red-400",
					bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700",
				}
			default:
				return {
					color: "text-gray-600 dark:text-gray-400",
					bg: "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700",
				}
		}
	}, [problem.difficulty])

	// --- Core Data Handling Functions ---
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
					if (!response.ok)
						throw new Error(
							`Failed to save: ${response.statusText}`
						)
					const updatedProblem: Problem = await response.json()
					if (!updatedProblem?.id)
						throw new Error("Invalid response from server")

					setLastSaved(new Date())
					onUpdate?.(problem.id, updatedProblem)
					if ("name" in updates) {
						// Only show loud toast for explicit saves from settings
						toast.success("Problem settings saved!")
					}
				} catch (err) {
					const errorMessage =
						err instanceof Error
							? err.message
							: "Failed to save changes"
					setError(errorMessage)
					toast.error(errorMessage)
				} finally {
					setSaving(false)
				}
			}, DEBOUNCE_DELAY),
		[problem.id, onUpdate]
	)

	const savePendingChanges = useCallback(() => {
		saveChanges.flush()
	}, [saveChanges])

	const handleDelete = useCallback(async () => {
		if (!confirm(`Are you sure you want to delete "${problem.name}"?`))
			return
		setDeleting(true)
		setError(null)
		try {
			// Cancel any pending saves before deleting
			saveChanges.cancel()
			const response = await fetch(`/api/review/delete`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: problem.id }),
			})
			if (!response.ok)
				throw new Error(`Failed to delete: ${response.statusText}`)

			// Optimistic UI update for instant feedback
			onUpdate?.(problem.id, null)
			toast.success("Problem deleted successfully")
			// Silently refresh server data in the background for consistency
			router.refresh()
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to delete problem"
			setError(errorMessage)
			toast.error(errorMessage)
		} finally {
			setDeleting(false)
			setSettingsOpen(false)
		}
	}, [problem.id, problem.name, router, onUpdate, saveChanges])

	const handleEditableChange = useCallback(
		(key: keyof EditableForm, value: string) => {
			setEditableForm((prev) => ({
				...prev,
				[key]: value.slice(0, MAX_INPUT_LENGTH),
			}))
			setError(null)
		},
		[]
	)

	const handleSettingsChange = useCallback(
		(key: keyof SettingsForm, value: string | Difficulty | boolean) => {
			setSettingsForm((prev) => ({ ...prev, [key]: value }))
			setError(null)
		},
		[]
	)

	const handleSettingsSave = useCallback(async () => {
		if (!settingsForm.name.trim()) {
			setError("Problem name is required")
			return
		}
		const categories = settingsForm.category
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean)
		if (categories.length === 0) {
			setError("At least one category is required")
			return
		}
		setSettingsSaving(true)
		const updates: Partial<Problem> = {
			...settingsForm,
			category: categories,
		}

		// Cancel any pending autosaves and flush the settings save immediately
		saveChanges.cancel()
		await saveChanges(updates)
		saveChanges.flush() // Ensure it completes

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
			onUpdate?.(problem.id, await res.json())
		} catch {
			setIsStarred(!newVal)
			toast.error("Failed to update star")
		}
	}, [isStarred, problem.id, onUpdate])

	// --- Autosave Effect with Cleanup ---
	useEffect(() => {
		// This handler defines what to save
		const saveHandler = () => {
			if (
				problem.notes !== editableForm.notes ||
				problem.mistakesMade !== editableForm.mistakesMade
			) {
				saveChanges(editableForm)
			}
		}
		// This schedules the save
		const debouncedSave = debounce(saveHandler, DEBOUNCE_DELAY)
		debouncedSave()

		// This is the cleanup function that prevents race conditions
		return () => {
			debouncedSave.cancel()
		}
	}, [editableForm, problem, saveChanges])

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

	return (
		<motion.div
			layout
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
		>
			<Collapsible
				open={open}
				onOpenChange={setOpen}
				className="group relative border border-gray-200/50 dark:border-white/[0.08] rounded-[14px] bg-white/40 dark:bg-black/20 backdrop-blur-md shadow-sm hover:shadow-md hover:bg-white/60 dark:hover:bg-white/[0.04] hover:border-gray-300/50 dark:hover:border-white/[0.12] transition-all duration-300 overflow-hidden"
			>
				<CollapsibleTrigger asChild>
					<div className="flex items-center justify-between py-3 px-5 cursor-pointer">
						<div className="flex-1 min-w-0">
							<h3 className="text-[15px] font-medium text-gray-800 dark:text-gray-100 truncate">
								{problem.name}
							</h3>
							<div className="flex items-center gap-2 mt-1.5 flex-wrap">
								<span className="text-sm text-gray-500 dark:text-gray-400">
									{problem.platform}
								</span>
								<div
									className={`px-2 py-1 rounded-full text-xs font-medium border ${difficultyStyle.bg} ${difficultyStyle.color}`}
								>
									{problem.difficulty}
								</div>
								{problem.platformRating && (
									<div className="px-2 py-1 rounded-[6px] text-[11px] font-bold border border-[#2B73FF]/30 bg-[#2B73FF]/10 text-[#2B73FF] dark:border-[#2B73FF]/40 dark:bg-[#2B73FF]/20 dark:text-[#5F9CFF] font-mono tracking-wide">
										{problem.platformRating}
									</div>
								)}
								{problem.isStuck && (
									<div
										title="Stuck"
										className="relative flex h-3 w-3 items-center justify-center ml-1"
									>
										<span 
											className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" 
											style={{ animationDuration: '3s' }}
										></span>
										<span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-sm border border-red-600"></span>
									</div>
								)}
							</div>
							{problem.category.length > 0 && (
								<div className="flex flex-wrap gap-1 mt-1.5">
									{problem.category
										.slice(0, 3)
										.map((cat, idx) => (
											<span
												key={idx}
												className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-md"
											>
												{cat}
											</span>
										))}
									{problem.category.length > 3 && (
										<span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs rounded-md">
											+{problem.category.length - 3} more
										</span>
									)}
								</div>
							)}
							{getFsrsLine() && (
								<p className="text-[11px] text-gray-400 dark:text-[#555] mt-1.5 font-medium tracking-wide">
									{getFsrsLine()}
								</p>
							)}
						</div>
						<div className="flex items-center gap-2 ml-3">
							{problem.notes && problem.notes.trim() && (
								<span title="Has notes">
									<FileText className="w-3.5 h-3.5 text-gray-300 dark:text-[#444] flex-shrink-0" />
								</span>
							)}
							{problem.mistakesMade && problem.mistakesMade.trim() && (
								<span title="Has mistakes logged">
									<AlertTriangle className="w-3.5 h-3.5 text-gray-300 dark:text-[#444] flex-shrink-0" />
								</span>
							)}
							<AnimatePresence mode="wait">
								{saving && (
									<motion.div
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
									>
										<Loader2 className="w-4 h-4 animate-spin text-blue-500" />
									</motion.div>
								)}
								{error && (
									<motion.div
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
									>
										<AlertCircle className="w-4 h-4 text-red-500" />
									</motion.div>
								)}
								{lastSaved && !saving && !error && (
									<motion.div
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
									>
										<Check className="w-4 h-4 text-green-500" />
									</motion.div>
								)}
							</AnimatePresence>
							<motion.button
								whileHover={{ scale: 1.1 }}
								onClick={handleStarToggle}
								className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
								title={isStarred ? "Unstar" : "Star"}
							>
								<Star
									className={`w-4 h-4 transition-colors ${
										isStarred
											? "fill-yellow-400 text-yellow-400"
											: "text-gray-400"
									}`}
								/>
							</motion.button>
							<Dialog
								open={settingsOpen}
								onOpenChange={setSettingsOpen}
							>
								<DialogTrigger asChild>
									<motion.button
										whileHover={{ scale: 1.1, rotate: 90 }}
										className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
										onClick={(e) => e.stopPropagation()}
									>
										<Settings className="w-4 h-4 text-gray-500" />
									</motion.button>
								</DialogTrigger>
								<DialogContent className="sm:max-w-md bg-white/80 dark:bg-black/40 backdrop-blur-3xl border border-gray-200 dark:border-white/[0.08] shadow-2xl max-h-[90vh] overflow-y-auto">
									<DialogHeader>
										<DialogTitle>
											Problem Settings
										</DialogTitle>
									</DialogHeader>
									<div className="space-y-4 pt-4">
										<div className="space-y-1">
											<label
												htmlFor="settings-name"
												className="text-sm font-medium"
											>
												Name{" "}
												<span className="text-red-500">
													*
												</span>
											</label>
											<Input
												id="settings-name"
												value={settingsForm.name}
												onChange={(e) =>
													handleSettingsChange(
														"name",
														e.target.value
													)
												}
											/>
										</div>
										<div className="space-y-1">
											<label
												htmlFor="settings-platform"
												className="text-sm font-medium"
											>
												Platform
											</label>
											<Input
												id="settings-platform"
												value={settingsForm.platform}
												onChange={(e) =>
													handleSettingsChange(
														"platform",
														e.target.value
													)
												}
											/>
										</div>
										<div className="space-y-1">
											<label
												htmlFor="settings-difficulty"
												className="text-sm font-medium"
											>
												Difficulty
											</label>
											<Select
												value={
													settingsForm.difficulty
												}
												onValueChange={(
													v: Difficulty
												) =>
													handleSettingsChange(
														"difficulty",
														v
													)
												}
											>
												<SelectTrigger id="settings-difficulty">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{DIFFICULTY_OPTIONS.map(
														(d) => (
															<SelectItem
																key={d}
																value={d}
															>
																{d}
															</SelectItem>
														)
													)}
												</SelectContent>
											</Select>
										</div>
										<div className="pt-2 border-t border-gray-100 dark:border-gray-800 mt-4">
											<button
												type="button"
												onClick={() => handleSettingsChange("isStuck", !settingsForm.isStuck)}
												className={`w-full py-2 px-4 rounded-md font-medium text-sm transition-all duration-200 ${
													settingsForm.isStuck
														? "bg-red-500 text-white hover:bg-red-600 overflow-hidden shadow-inner ring-1 ring-red-600"
														: "bg-green-100/50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-500 dark:hover:bg-green-900/50 outline-dashed outline-1 outline-green-400 dark:outline-green-600"
												}`}
											>
												{settingsForm.isStuck ? "Stuck" : "Stuck?"}
											</button>
										</div>
										<CategoryAutocomplete
											id="settings-category"
											value={settingsForm.category}
											onChange={(value) => handleSettingsChange("category", value)}
										/>
									</div>
									<div className="flex justify-end gap-2 pt-6">
										<Button
											variant="destructive"
											onClick={handleDelete}
											disabled={
												deleting || settingsSaving
											}
										>
											{deleting ? (
												<>
													<Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
													Deleting...
												</>
											) : (
												"Delete"
											)}
										</Button>
										<Button
											variant="outline"
											onClick={handleSettingsReset}
										>
											Reset
										</Button>
										<Button
											onClick={handleSettingsSave}
											disabled={
												settingsSaving || deleting
											}
										>
											{settingsSaving ? (
												<>
													<Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
													Saving...
												</>
											) : (
												"Save Changes"
											)}
										</Button>
									</div>
								</DialogContent>
							</Dialog>
							<motion.div animate={{ rotate: open ? 180 : 0 }}>
								<ChevronDown className="w-5 h-5 text-gray-400" />
							</motion.div>
						</div>
					</div>
				</CollapsibleTrigger>
				<div
					style={{
						display: "grid",
						gridTemplateRows: open ? "1fr" : "0fr",
						transition: "grid-template-rows 0.25s ease",
					}}
				>
					<div className="overflow-hidden">
						<div className="px-6 pb-6 pt-4 space-y-4 border-t border-gray-100 dark:border-white/[0.06] bg-gray-50/30 dark:bg-white/[0.01]">
							{(problem.reviewCount || problem.lastReview || problem.nextReviewDate || problem.link) && (
								<div className="flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-gray-500 dark:text-[#666] pb-3 border-b border-gray-100 dark:border-white/[0.04]">
									{problem.reviewCount != null && problem.reviewCount > 0 && (
										<span><span className="font-medium text-gray-700 dark:text-[#888]">{problem.reviewCount}</span> reviews</span>
									)}
									{problem.lastReview && (
										<span>Last reviewed <span className="font-medium text-gray-700 dark:text-[#888]">
											{(() => {
												const d = Math.floor((Date.now() - new Date(problem.lastReview!).getTime()) / (1000 * 60 * 60 * 24))
												return d === 0 ? "today" : `${d}d ago`
											})()}
										</span></span>
									)}
									{problem.nextReviewDate && (
										<span>Next review <span className="font-medium text-gray-700 dark:text-[#888]">
											{new Date(problem.nextReviewDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
										</span></span>
									)}
									{problem.link && (
										<a href={problem.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
											View problem →
										</a>
									)}
								</div>
							)}
							<div className="space-y-4">
								<div className="space-y-1">
									<label
										htmlFor={`notes-${problem.id}`}
										className="text-sm font-medium"
									>
										📝 Notes
									</label>
									<Textarea
										id={`notes-${problem.id}`}
										value={editableForm.notes}
										onChange={(e) =>
											handleEditableChange("notes", e.target.value)
										}
										onBlur={savePendingChanges}
									/>
								</div>
								<div className="space-y-1">
									<label
										htmlFor={`mistakes-${problem.id}`}
										className="text-sm font-medium"
									>
										❌ Mistakes Made
									</label>
									<Textarea
										id={`mistakes-${problem.id}`}
										value={editableForm.mistakesMade}
										onChange={(e) =>
											handleEditableChange("mistakesMade", e.target.value)
										}
										onBlur={savePendingChanges}
									/>
								</div>
							</div>
						</div>
					</div>
				</div>
			</Collapsible>
		</motion.div>
	)
}
