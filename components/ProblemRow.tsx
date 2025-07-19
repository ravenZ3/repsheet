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
	X,
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
import { Difficulty, Status, type Problem } from "@prisma/client"

// --- Constants for Configuration ---
const DIFFICULTY_OPTIONS: Difficulty[] = [
	Difficulty.Easy,
	Difficulty.Medium,
	Difficulty.Hard,
]
const STATUS_OPTIONS: Status[] = [
	Status.ToRevise,
	Status.Solved,
	Status.Stuck,
	Status.Revisited,
]
const MAX_INPUT_LENGTH = 2000
const DEBOUNCE_DELAY = 5000 // Increased to 5 seconds for a better UX

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
	status: Status
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
		status: problem.status,
		category: problem.category.join(", "),
	})
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [lastSaved, setLastSaved] = useState<Date | null>(null)
	const [settingsSaving, setSettingsSaving] = useState(false)
	const [deleting, setDeleting] = useState(false)

	// --- Memoized Styles for Performance ---
	const statusStyle = useMemo(() => {
		switch (problem.status) {
			case Status.Solved:
				return {
					color: "text-emerald-600 dark:text-emerald-400",
					bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700",
				}
			case Status.ToRevise:
				return {
					color: "text-amber-600 dark:text-amber-400",
					bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700",
				}
			case Status.Stuck:
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
	}, [problem.status])

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
		(key: keyof SettingsForm, value: string | Difficulty | Status) => {
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
	}, [settingsForm, saveChanges])

	const handleSettingsReset = useCallback(() => {
		setSettingsForm({
			name: problem.name,
			platform: problem.platform || "",
			difficulty: problem.difficulty,
			status: problem.status,
			category: problem.category.join(", "),
		})
		setError(null)
	}, [problem])

	const formatLastSaved = useCallback((date: Date) => {
		// ... (your formatting logic is good)
		return `Saved at ${date.toLocaleTimeString()}`
	}, [])

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
				className="group border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
			>
				<CollapsibleTrigger asChild>
					<div className="flex items-center justify-between p-6 cursor-pointer">
						<div className="flex-1 min-w-0">
							<h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 truncate">
								{problem.name}
							</h3>
							<div className="flex items-center gap-3 mt-2">
								<span className="text-sm text-gray-500 dark:text-gray-400">
									{problem.platform}
								</span>
								<div
									className={`px-2 py-1 rounded-full text-xs font-medium border ${difficultyStyle.bg} ${difficultyStyle.color}`}
								>
									{problem.difficulty}
								</div>
								<div
									className={`px-2 py-1 rounded-full text-xs font-medium border ${statusStyle.bg} ${statusStyle.color}`}
								>
									{problem.status}
								</div>
							</div>
							{problem.category.length > 0 && (
								<div className="flex flex-wrap gap-1 mt-2">
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
						</div>
						<div className="flex items-center gap-3 ml-4">
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
								<DialogContent className="sm:max-w-md bg-white dark:bg-gray-800">
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
										<div className="grid grid-cols-2 gap-4">
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
											<div className="space-y-1">
												<label
													htmlFor="settings-status"
													className="text-sm font-medium"
												>
													Status
												</label>
												<Select
													value={settingsForm.status}
													onValueChange={(
														v: Status
													) =>
														handleSettingsChange(
															"status",
															v
														)
													}
												>
													<SelectTrigger id="settings-status">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{STATUS_OPTIONS.map(
															(s) => (
																<SelectItem
																	key={s}
																	value={s}
																>
																	{s ===
																	"ToRevise"
																		? "To Revise"
																		: s}
																</SelectItem>
															)
														)}
													</SelectContent>
												</Select>
											</div>
										</div>
										<div className="space-y-1">
											<label
												htmlFor="settings-category"
												className="text-sm font-medium"
											>
												Categories
											</label>
											<Input
												id="settings-category"
												value={settingsForm.category}
												onChange={(e) =>
													handleSettingsChange(
														"category",
														e.target.value
													)
												}
												placeholder="Arrays, DP, Trees..."
											/>
											<p className="text-xs text-gray-500">
												Separate with commas.
											</p>
										</div>
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
				<AnimatePresence>
					{open && (
						// You are already animating the container, which is good.
						<motion.div
							key="content-wrapper" // Add a key for stable animation
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: "auto", opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
							transition={{ duration: 0.3, ease: "easeInOut" }}
							// Add `overflow: 'hidden'` to clip the content during animation
							style={{ overflow: "hidden" }}
						>
							<CollapsibleContent
								id={`collapsible-content-${problem.id}`}
								// Force the content to always be visible to its parent (the motion.div)
								// so that the parent can handle the clipping.
								forceMount
								className="overflow-hidden" // Add overflow-hidden here too for safety
							>
								{/* --- THE FIX IS HERE --- */}
								{/* Wrap the actual content in ANOTHER motion.div and animate its scale and opacity */}
								<motion.div
									initial={{ opacity: 0, y: -20 }} // Start slightly "up" and faded out
									animate={{ opacity: 1, y: 0 }} // Animate to full opacity and normal position
									exit={{ opacity: 0, y: -20 }} // Fade out and move up on exit
									transition={{
										duration: 0.2,
										ease: "easeOut",
									}} // A slightly faster transition for the content
									className="px-6 pb-6 pt-4 space-y-4 border-t border-gray-100 dark:border-gray-700"
								>
									{/* All your content (Textareas, labels, etc.) now lives inside this new motion.div */}
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
													handleEditableChange(
														"notes",
														e.target.value
													)
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
												value={
													editableForm.mistakesMade
												}
												onChange={(e) =>
													handleEditableChange(
														"mistakesMade",
														e.target.value
													)
												}
												onBlur={savePendingChanges}
											/>
										</div>
									</div>
									<div className="flex items-center justify-between pt-2">
										{/* ... your save status indicator ... */}
									</div>
								</motion.div>
								{/* --- END OF FIX --- */}
							</CollapsibleContent>
						</motion.div>
					)}
				</AnimatePresence>
			</Collapsible>
		</motion.div>
	)
}
