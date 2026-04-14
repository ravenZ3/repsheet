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
import type { Problem } from "@prisma/client"

// Constants
const DIFFICULTY_OPTIONS = ["Easy", "Medium", "Hard"] as const
const MAX_LINK_LENGTH = 200
const MAX_ID_LENGTH = 50
const DEBOUNCE_DELAY = 1000

// Type definitions
type Difficulty = typeof DIFFICULTY_OPTIONS[number]


interface FormState {
  problemId: string
  name: string
  platform: string
  link: string
  difficulty: Difficulty
  isStuck: boolean
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



// Reusable FormField component
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
        className="text-[13px] font-semibold text-gray-700 dark:text-[#888] tracking-wide block"
      >
        {label} {required && <span className="text-rose-500/80">*</span>}
      </label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`transition-all duration-200 focus:ring-0 bg-gray-50/50 dark:bg-white/[0.02] text-gray-900 dark:text-[rgba(255,255,255,0.9)] border-gray-200 dark:border-white/[0.06] focus:border-gray-400 dark:focus:border-white/[0.2] text-[13px] h-9 ${
          error ? "border-red-500/50 dark:border-rose-500/50" : ""
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
    isStuck: false,
    category: "",
    dateSolved: format(new Date(), "yyyy-MM-dd"),
  })
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>> & { form?: string }
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
      let endpoint = "/api/leetcode"
      
      // Dynamic routing to the correct Platform API Parser
      if (identifier.toLowerCase().includes("codeforces.com") || /^\d+[A-Za-z0-9]+$/.test(identifier)) {
          endpoint = "/api/codeforces"
      } else if (identifier.startsWith("http")) {
        const extractedSlug = extractProblemIdFromUrl(identifier)
        if (!extractedSlug) throw new Error("Invalid LeetCode URL format.")
        identifier = extractedSlug
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || `API responded with status ${response.status}`)
      if (!result.success || !result.data) throw new Error(result.error || "No data received from API.")
      
      const problemData = result.data
      const difficultyMap: Record<string, Difficulty> = { Easy: "Easy", Medium: "Medium", Hard: "Hard" }
      const categories = problemData.tags ? problemData.tags.join(", ") : (problemData.topicTags?.map((tag: { name: string }) => tag.name).join(", ") || "")
      
      setForm((prev) => ({
        ...prev,
        problemId: problemData.questionFrontendId || identifier,
        name: problemData.title,
        platform: problemData.platform || "LeetCode",
        link: problemData.link || `https://leetcode.com/problems/${problemData.titleSlug}/`,
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
    (name: keyof FormState, value: string | boolean) => {
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
            isStuck: form.isStuck,
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
      problemId: "",
      name: "",
      platform: "",
      link: "",
      difficulty: "Easy",
      isStuck: false,
      category: "",
      dateSolved: format(new Date(), "yyyy-MM-dd"),
    })
    setErrors({})
    setFetchStatus("idle")
    toast.info("Form reset")
  }, [])

  const handleCancel = useCallback(() => {
    router.back()
  }, [router])

  return (
    <div className="relative w-full z-0 pb-20">
      {/* Raycast-style glowing ambient red orb */}
      <div className="hidden md:block fixed top-[10%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-red-600/[0.05] dark:bg-red-500/[0.05] blur-[120px] rounded-full pointer-events-none -z-10" style={{ willChange: "transform", transform: "translateZ(0)" }} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-xl mx-auto mt-12 p-6 md:p-8 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08] backdrop-blur-3xl rounded-[16px] shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent mix-blend-overlay pointer-events-none" />
        <h1 className="text-lg mb-6 font-semibold tracking-tight text-gray-900 dark:text-[rgba(255,255,255,0.95)]">
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
          <label
            htmlFor="problemId"
            className="text-[13px] font-semibold text-gray-700 dark:text-[#888] tracking-wide block"
          >
            Problem ID <span className="text-rose-500/80">*</span>
          </label>
          <div className="flex gap-2">
            <Input
              id="problemId"
              type="text"
              value={form.problemId}
              onChange={(e) => handleChange("problemId", e.target.value)}
              placeholder="e.g., two-sum, 1, or LeetCode URL"
              maxLength={MAX_ID_LENGTH}
              className={`flex-1 transition-all duration-200 focus:ring-0 bg-gray-50/50 dark:bg-white/[0.02] text-gray-900 dark:text-[rgba(255,255,255,0.9)] border-gray-200 dark:border-white/[0.06] focus:border-gray-400 dark:focus:border-white/[0.2] text-[13px] h-9 ${
                errors.problemId ? "border-red-500/50 dark:border-rose-500/50" : ""
              }`}
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
              className="px-3 transition-all h-9 text-[12px] duration-200 border-gray-200 bg-transparent dark:border-white/[0.08] dark:text-[#888] hover:bg-gray-100 dark:hover:bg-white/[0.05] dark:hover:text-white min-w-[100px]"
            >
              {fetching ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  Fetching...
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5 mr-1" />
                  Auto-fill
                </>
              )}
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
            <div
              id="problemId-error"
              className="text-sm text-red-500 dark:text-red-400 flex items-center gap-1 mt-1"
            >
              <AlertCircle className="w-4 h-4" />
              {errors.problemId}
            </div>
          )}
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Enter a LeetCode problem slug (e.g., &quot;two-sum&quot;), problem number, or full URL
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
        <div className="space-y-1">
          <label
            htmlFor="difficulty"
            className="text-[13px] font-semibold text-gray-700 dark:text-[#888] tracking-wide block"
          >
            Difficulty
          </label>
          <Select
            value={form.difficulty}
            onValueChange={(value: Difficulty) => handleChange("difficulty", value)}
          >
            <SelectTrigger
              id="difficulty"
              className="transition-all duration-200 focus:ring-0 bg-gray-50/50 dark:bg-white/[0.02] text-gray-900 dark:text-[rgba(255,255,255,0.9)] border-gray-200 dark:border-white/[0.06] focus:border-gray-400 dark:focus:border-white/[0.2] text-[13px] h-9"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#111] text-gray-900 dark:text-[rgba(255,255,255,0.9)] border-gray-200 dark:border-white/[0.08] text-[13px]">
              {DIFFICULTY_OPTIONS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
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
        
        <div className="mt-4 mb-3 pt-2">
          <button
            type="button"
            onClick={() => handleChange("isStuck", !form.isStuck)}
            className={`w-full flex justify-center tracking-wide py-2 rounded-lg font-medium text-[13px] transition-all duration-200 border ${
              form.isStuck
                ? "bg-red-500/10 dark:bg-rose-500/[0.05] text-red-600 dark:text-rose-400 border-red-500/30 dark:border-rose-500/20 shadow-sm"
                : "bg-transparent dark:bg-white/[0.01] text-gray-500 dark:text-[#888] border-gray-200 dark:border-white/[0.05] hover:bg-gray-50 dark:hover:bg-white/[0.03] dark:hover:text-[rgba(255,255,255,0.9)]"
            }`}
          >
            {form.isStuck ? "Stuck ✘" : "Mark as stuck"}
          </button>
        </div>
        
        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100 dark:border-white/[0.06]">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={submitting}
            className="transition-all duration-200 border-gray-200 bg-transparent dark:border-white/[0.08] dark:text-[#888] hover:bg-gray-100 dark:hover:bg-white/[0.05] dark:hover:text-white h-8 text-[12px] px-4"
          >
            Clear
          </Button>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={submitting}
            className="transition-all duration-200 border-gray-200 bg-transparent dark:border-white/[0.08] dark:text-[#888] hover:bg-gray-100 dark:hover:bg-white/[0.05] dark:hover:text-white h-8 text-[12px] px-4"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="transition-all duration-200 bg-gray-900 text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-white/90 shadow-sm active:scale-95 h-8 text-[12px] px-5 font-medium border-0"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              "Save Problem"
            )}
          </Button>
        </div>
      </div>
      </motion.div>
    </div>
  )
}