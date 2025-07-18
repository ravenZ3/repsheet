// This component corresponds to app/add/page.tsx
"use client"

import { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select"
import { toast } from "sonner"
import { motion } from "framer-motion"
import {
	AlertCircle,
	Loader2,
	Search,
	CheckCircle,
	XCircle,
} from "lucide-react"
import debounce from "lodash.debounce"
import { format } from "date-fns"
import CategoryAutocomplete from "@/components/CategoryAutocomplete"
import type { Problem, Difficulty, Status } from "@prisma/client"

// Constants
const DIFFICULTY_OPTIONS: Difficulty[] = ["Easy", "Medium", "Hard"]
// Note: Ensure these statuses match your Prisma schema enum exactly.
const STATUS_OPTIONS: Status[] = ["To Revise", "Stuck", "Solved", "Revisited"]
const MAX_LINK_LENGTH = 200
const MAX_ID_LENGTH = 50
const DEBOUNCE_DELAY = 1000

// Type definitions
interface FormState {
	problemId: string
	name: string
	platform: string
	link: string
	difficulty: Difficulty
	status: Status
	category: string
	dateSolved: string
}

interface FormFieldProps {
	label: string
	value: string
	onChange: (value: string) => void
	placeholder?: string
	required?: boolean
	type?: "input" | "textarea" | "date"
	maxLength?: number
	id: string
	error?: string
}

interface LeetCodeProblem {
	questionId: string
	questionFrontendId: string
	title: string
	titleSlug: string
	difficulty: string
	topicTags: Array<{ name: string }>
	content: string
}

// Reusable FormField component...
function FormField({
	label,
	value,
	onChange,
	placeholder,
	required,
	type = "input",
	maxLength,
	id,
	error,
}: FormFieldProps) {
	return (
		<div className="space-y-1">
			<label
				htmlFor={id}
				className="text-sm font-medium text-gray-700 dark:text-gray-300 block"
			>
				{label} {required && <span className="text-red-500">*</span>}
			</label>
			<Input
				id={id}
				type={type}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				maxLength={maxLength}
				className={`transition-all duration-200 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 ${
					error ? "border-red-500" : ""
				}`}
				aria-required={required}
				aria-invalid={!!error}
				aria-describedby={error ? `${id}-error` : undefined}
			/>
			{error && (
				<div
					id={`${id}-error`}
					className="text-sm text-red-500 dark:text-red-400 flex items-center gap-1 mt-1"
				>
					<AlertCircle className="w-4 h-4" />
					{error}
				</div>
			)}
		</div>
	)
}

function extractProblemIdFromUrl(url: string): string | null {
	const patterns = [
		/leetcode\.com\/problems\/([^\/\?]+)/,
		/leetcode\.com\/contest\/[^\/]+\/problems\/([^\/\?]+)/,
		/leetcode\.com\/explore\/[^\/]+\/card\/[^\/]+\/[^\/]+\/problems\/([^\/\?]+)/,
	]
	for (const pattern of patterns) {
		const match = url.match(pattern)
		if (match) return match[1]
	}
	return null
}

export default function AddProblemPage() {
	const router = useRouter()
	const [form, setForm] = useState<FormState>({
		problemId: "",
		name: "",
		platform: "",
		link: "",
		difficulty: "Easy",
		status: "To Revise",
		category: "",
		dateSolved: format(new Date(), "yyyy-MM-dd"),
	})
	const [errors, setErrors] = useState<
		Partial<Record<keyof FormState, string>>
	>({})
	const [submitting, setSubmitting] = useState(false)
	const [fetching, setFetching] = useState(false)
	const [fetchStatus, setFetchStatus] = useState<
		"idle" | "success" | "error"
	>("idle")

	const validateForm = useCallback(
		(formData: FormState): Partial<Record<keyof FormState, string>> => {
			const newErrors: Partial<Record<keyof FormState, string>> = {}
			if (!formData.problemId.trim()) newErrors.problemId = "Problem ID is required"
			if (!formData.name.trim()) newErrors.name = "Problem name is required"
			if (!formData.category.trim()) {
				newErrors.category = "At least one category is required"
			}
			if (formData.link && !/^(https?:\/\/)/i.test(formData.link)) {
				newErrors.link = "Link must be a valid URL"
			}
			if (formData.dateSolved && isNaN(new Date(formData.dateSolved).getTime())) {
				newErrors.dateSolved = "Invalid date format"
			}
			return newErrors
		},
		[]
	)

	const fetchProblemDetails = useCallback(async () => {
		if (!form.problemId.trim()) {
			toast.error("Please enter a Problem ID or LeetCode URL first")
			return
		}
		setFetching(true)
		setFetchStatus("idle")
		try {
			let identifier = form.problemId.trim()
			if (identifier.startsWith("http")) {
				const extractedSlug = extractProblemIdFromUrl(identifier)
				if (!extractedSlug) throw new Error("Invalid LeetCode URL format.")
				identifier = extractedSlug
			}
			const response = await fetch("/api/leetcode", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ identifier }),
			})
			const result = await response.json()
			if (!response.ok) throw new Error(result.error || `API responded with status ${response.status}`)
			if (!result.success || !result.data) throw new Error(result.error || "No data received from API.")
			
			const problemData: LeetCodeProblem = result.data
			const difficultyMap: Record<string, Difficulty> = { Easy: "Easy", Medium: "Medium", Hard: "Hard" }
			const categories = problemData.topicTags.map((tag) => tag.name).join(", ")
			
			setForm((prev) => ({
				...prev,
				problemId: problemData.questionFrontendId || prev.problemId,
				name: problemData.title,
				platform: "LeetCode",
				link: `https://leetcode.com/problems/${problemData.titleSlug}/`,
				difficulty: difficultyMap[problemData.difficulty] || "Easy",
				category: categories || prev.category,
			}))
			setFetchStatus("success")
			toast.success("Problem details fetched successfully!")
			setErrors((prev) => ({ ...prev, name: undefined, platform: undefined, link: undefined, category: categories ? undefined : prev.category }))
		} catch (error) {
			console.error("Error fetching problem details:", error)
			setFetchStatus("error")
			const errorMessage = error instanceof Error ? error.message : "Failed to fetch problem details"
			toast.error(`Failed to fetch: ${errorMessage}`)
		} finally {
			setFetching(false)
		}
	}, [form.problemId])

	const handleChange = useCallback(
		(name: keyof FormState, value: string | Difficulty | Status) => {
			setForm((prev) => ({ ...prev, [name]: value }))
			setErrors((prev) => ({ ...prev, [name]: undefined }))
			if (name === "problemId") setFetchStatus("idle")
		},
		[]
	)

	const handleSubmit = useMemo(
		() =>
			debounce(async () => {
				const newErrors = validateForm(form)
				if (Object.keys(newErrors).length > 0) {
					setErrors(newErrors)
					toast.error("Please fix the form errors before saving.")
					return
				}
				setSubmitting(true)
				setErrors({})
				try {
					const problemData: Partial<Problem> = {
						problemId: form.problemId,
						name: form.name,
						platform: form.platform,
						link: form.link,
						difficulty: form.difficulty,
						status: form.status,
						category: form.category.split(",").map((t) => t.trim()).filter(Boolean),
						dateSolved: form.dateSolved ? new Date(form.dateSolved) : undefined,
					}
					const response = await fetch("/api/problem", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(problemData),
					})
					const result = await response.json()
					if (!response.ok || result.success === false) {
						throw new Error(result.message || result.error || "Problem saving failed on server.")
					}
					toast.success("Problem added successfully!")
					router.push("/review")
				} catch (err) {
					const errorMessage = err instanceof Error ? err.message : "Failed to save problem"
					setErrors({ form: errorMessage })
					toast.error(errorMessage)
				} finally {
					setSubmitting(false)
				}
			}, DEBOUNCE_DELAY),
		[form, router, validateForm]
	)

	const handleReset = useCallback(() => {
		setForm({
			problemId: "", name: "", platform: "", link: "", difficulty: "Easy",
			status: "To Revise", category: "", dateSolved: format(new Date(), "yyyy-MM-dd"),
		})
		setErrors({})
		setFetchStatus("idle")
		toast.info("Form reset")
	}, [])

	const handleCancel = useCallback(() => {
		router.back()
	}, [router])

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, ease: "easeOut" }}
			className="max-w-xl mx-auto mt-10 p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-lg"
		>
			<h1 className="text-xl mb-4 font-semibold text-gray-800 dark:text-gray-100">
				Add Problem
			</h1>

			{errors.form && (
				<motion.div
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg p-3 text-red-700 dark:text-red-400 mb-4"
				>
					<div className="flex items-center gap-2">
						<AlertCircle className="w-4 h-4" />
						<span className="text-sm">{errors.form}</span>
					</div>
				</motion.div>
			)}

			<div className="space-y-4">
				<div className="space-y-1">
					<label htmlFor="problemId" className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
						Problem ID <span className="text-red-500">*</span>
					</label>
					<div className="flex gap-2">
						<Input
							id="problemId"
							type="text"
							value={form.problemId}
							onChange={(e) => handleChange("problemId", e.target.value)}
							placeholder="e.g., two-sum, 1, or LeetCode URL"
							maxLength={MAX_ID_LENGTH}
							className={`flex-1 transition-all duration-200 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 ${errors.problemId ? "border-red-500" : ""}`}
							aria-required={true}
							aria-invalid={!!errors.problemId}
							aria-describedby={errors.problemId ? "problemId-error" : undefined}
						/>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={fetchProblemDetails}
							disabled={fetching || !form.problemId.trim()}
							className="px-3 transition-all duration-200 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 min-w-[100px]"
						>
							{fetching ? (<><Loader2 className="w-4 h-4 animate-spin mr-1" />Fetching...</>) : (<><Search className="w-4 h-4 mr-1" />Auto-fill</>)}
						</Button>
					</div>

					{fetchStatus === "success" && (
						<div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1 mt-1">
							<CheckCircle className="w-4 h-4" />
							Problem details fetched successfully!
						</div>
					)}
					{fetchStatus === "error" && (
						<div className="text-sm text-red-500 dark:text-red-400 flex items-center gap-1 mt-1">
							<XCircle className="w-4 h-4" />
							Failed to fetch problem details
						</div>
					)}
					{errors.problemId && (
						<div id="problemId-error" className="text-sm text-red-500 dark:text-red-400 flex items-center gap-1 mt-1">
							<AlertCircle className="w-4 h-4" />
							{errors.problemId}
						</div>
					)}
					<div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
						{/* FIX: Replaced quotes with HTML entities */}
						Enter a LeetCode problem slug (e.g., "two-sum"), problem number, or full URL
					</div>
				</div>

				<FormField
					id="name"
					label="Problem Name"
					value={form.name}
					onChange={(value) => handleChange("name", value)}
					placeholder="Enter problem name"
					required
					maxLength={100}
					error={errors.name}
				/>
				<FormField
					id="platform"
					label="Platform"
					value={form.platform}
					onChange={(value) => handleChange("platform", value)}
					placeholder="e.g., LeetCode, Codeforces"
					maxLength={50}
					error={errors.platform}
				/>
				<FormField
					id="link"
					label="Problem Link"
					value={form.link}
					onChange={(value) => handleChange("link", value)}
					placeholder="https://..."
					maxLength={MAX_LINK_LENGTH}
					error={errors.link}
				/>
				<CategoryAutocomplete
					id="category"
					value={form.category}
					onChange={(value) => handleChange("category", value)}
					error={errors.category}
				/>
				<div>
					<label htmlFor="difficulty" className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
						Difficulty
					</label>
					<Select value={form.difficulty} onValueChange={(value: Difficulty) => handleChange("difficulty", value)}>
						<SelectTrigger id="difficulty" className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700">
							<SelectValue />
						</SelectTrigger>
						<SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700">
							{DIFFICULTY_OPTIONS.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
						</SelectContent>
					</Select>
				</div>
				<div>
					<label htmlFor="status" className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
						Status
					</label>
					<Select value={form.status} onValueChange={(value: Status) => handleChange("status", value)}>
						<SelectTrigger id="status" className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700">
							<SelectValue />
						</SelectTrigger>
						<SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700">
							{STATUS_OPTIONS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
						</SelectContent>
					</Select>
				</div>
				<FormField
					id="dateSolved"
					label="Date Solved"
					value={form.dateSolved}
					onChange={(value) => handleChange("dateSolved", value)}
					type="date"
					error={errors.dateSolved}
				/>
				<div className="flex justify-end gap-2 mt-6">
					<Button variant="outline" onClick={handleReset} disabled={submitting}>
						Reset
					</Button>
					<Button variant="outline" onClick={handleCancel} disabled={submitting}>
						Cancel
					</Button>
					<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
						<Button onClick={handleSubmit} disabled={submitting} className="bg-blue-600 text-white hover:bg-blue-500">
							{submitting ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</>) : ("Save Problem")}
						</Button>
					</motion.div>
				</div>
			</div>
		</motion.div>
	)
}