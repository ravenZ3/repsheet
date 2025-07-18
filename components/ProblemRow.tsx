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

// Constants
const DIFFICULTY_OPTIONS: Difficulty[] = [
  Difficulty.Easy,
  Difficulty.Medium,
  Difficulty.Hard,
]
const STATUS_OPTIONS: Status[] = [Status.Pending, Status.Solved, Status.Review]
const MAX_INPUT_LENGTH = 1000
const DEBOUNCE_DELAY = 1000

// Type definitions
interface ProblemRowProps {
  problem: Problem | null
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

interface FormFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  type?: "input" | "textarea"
  maxLength?: number
  id: string
  onBlur?: () => void
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
  onBlur,
}: FormFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block"
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {type === "input" ? (
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 transition-all duration-200 focus:ring-2 focus:ring-blue-500"
          aria-required={required}
          onBlur={onBlur}
        />
      ) : (
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={3}
          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 resize-none transition-all duration-200 focus:ring-2 focus:ring-blue-500"
          aria-required={required}
          onBlur={onBlur}
        />
      )}
    </div>
  )
}

/**
 * ProblemRow component for displaying, editing, and deleting a problem's details
 */
export default function ProblemRow({ problem, onUpdate }: ProblemRowProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editableForm, setEditableForm] = useState<EditableForm>({
    notes: problem?.notes || "",
    mistakesMade: problem?.mistakesMade || "",
  })
  const [settingsForm, setSettingsForm] = useState<SettingsForm>({
    name: problem?.name || "",
    platform: problem?.platform || "",
    difficulty: problem?.difficulty as Difficulty || Difficulty.Easy,
    status: problem?.status as Status || Status.Pending,
    category: problem?.category?.join(", ") || "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Memoized styles
  const statusStyle = useMemo(() => {
    switch (problem?.status) {
      case Status.Solved:
        return {
          color: "text-emerald-600 dark:text-emerald-400",
          bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700",
        }
      case Status.Review:
        return {
          color: "text-amber-600 dark:text-amber-400",
          bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700",
        }
      case Status.Pending:
      default:
        return {
          color: "text-gray-600 dark:text-gray-400",
          bg: "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700",
        }
    }
  }, [problem?.status])

  const difficultyStyle = useMemo(() => {
    switch (problem?.difficulty) {
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
  }, [problem?.difficulty])

  const saveChanges = useMemo(
    () =>
      debounce(async (updates: Partial<Problem>) => {
        if (!problem?.id) return;

        setSaving(true);
        setError(null);
        try {
          const response = await fetch(`/api/problem/${problem.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          });

          if (!response.ok) {
            throw new Error(`Failed to save: ${response.statusText}`);
          }

          const updatedProblem: Problem = await response.json();
          if (!updatedProblem.id) {
            throw new Error("Invalid response from server: missing problem ID");
          }
          setLastSaved(new Date());
          onUpdate?.(problem.id, updatedProblem);
          toast.success("Changes saved successfully");
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to save changes";
          setError(errorMessage);
          toast.error(errorMessage);
        } finally {
          setSaving(false);
        }
      }, DEBOUNCE_DELAY),
    [problem?.id, onUpdate]
  )

  const savePendingChanges = useCallback(() => {
    if (!problem) return;
    if (
      problem.notes !== editableForm.notes ||
      problem.mistakesMade !== editableForm.mistakesMade
    ) {
      saveChanges.cancel();
      saveChanges(editableForm);
    }
  }, [editableForm, problem, saveChanges])

  const handleDelete = useCallback(async () => {
    if (!problem || !confirm(`Are you sure you want to delete "${problem.name}"?`)) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/review/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: problem.id }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete: ${response.statusText}`);
      }
      toast.success("Problem deleted successfully");
      router.refresh();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete problem";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
      setSettingsOpen(false);
    }
  }, [problem, router])

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

  useEffect(() => {
    if (!problem) return;

    const saveHandler = () => {
      if (
        problem.notes !== editableForm.notes ||
        problem.mistakesMade !== editableForm.mistakesMade
      ) {
        saveChanges(editableForm);
      }
    };

    const debouncedSave = debounce(saveHandler, DEBOUNCE_DELAY);
    debouncedSave();

    return () => {
      debouncedSave.cancel();
    };
  }, [editableForm, saveChanges, problem])

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
    saveChanges.cancel()
    await saveChanges(updates)
    setSettingsSaving(false)
    setSettingsOpen(false)
  }, [settingsForm, saveChanges])

  const handleSettingsReset = useCallback(() => {
    if (!problem) return
    setSettingsForm({
      name: problem.name || "",
      platform: problem.platform || "",
      difficulty: problem.difficulty as Difficulty || Difficulty.Easy,
      status: problem.status as Status || Status.Pending,
      category: problem.category?.join(", ") || "",
    })
    setError(null)
  }, [problem])

  const formatLastSaved = useCallback((date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return "just now"
    if (minutes === 1) return "1 minute ago"
    if (minutes < 60) return `${minutes} minutes ago`
    return date.toLocaleTimeString()
  }, [])

  if (!problem) {
    return null
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Collapsible
        open={open}
        onOpenChange={setOpen}
        className="group border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
      >
        <CollapsibleTrigger
          asChild
          aria-expanded={open}
          aria-controls={`collapsible-content-${problem.id}`}
        >
          <div className="flex items-center justify-between p-6 cursor-pointer">
            <div className="flex-1 min-w-0">
              <motion.h3
                className="text-lg font-medium text-gray-800 dark:text-gray-100 group-hover:text-gray-900 dark:group-hover:text-white transition-colors truncate"
                layoutId={`title-${problem.id}`}
              >
                {problem.name}
              </motion.h3>

              <div className="flex items-center gap-3 mt-2">
                <motion.span
                  className="text-sm text-gray-500 dark:text-gray-400"
                  layoutId={`platform-${problem.id}`}
                >
                  {problem.platform}
                </motion.span>

                <motion.div
                  className={`px-2 py-1 rounded-full text-xs font-medium border ${difficultyStyle.bg} ${difficultyStyle.color}`}
                  layoutId={`difficulty-${problem.id}`}
                >
                  {problem.difficulty}
                </motion.div>

                <motion.div
                  className={`px-2 py-1 rounded-full text-xs font-medium border ${statusStyle.bg} ${statusStyle.color}`}
                  layoutId={`status-${problem.id}`}
                >
                  {problem.status}
                </motion.div>
              </div>

              {problem.category?.length > 0 && (
                <motion.div
                  className="flex flex-wrap gap-1 mt-2"
                  layoutId={`categories-${problem.id}`}
                >
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
                </motion.div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <AnimatePresence mode="wait">
                {saving && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500 dark:text-blue-400" />
                  </motion.div>
                )}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
                  </motion.div>
                )}
                {lastSaved && !saving && !error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Check className="w-4 h-4 text-green-500 dark:text-green-400" />
                  </motion.div>
                )}
              </AnimatePresence>

              <Dialog
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
              >
                <DialogTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.05, rotate: 90 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Open problem settings"
                  >
                    <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </motion.button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700">
                  <DialogHeader>
                    <DialogTitle>
                      Problem Settings
                    </DialogTitle>
                  </DialogHeader>

                  {error && (
                    <motion.div
                      initial={{
                        opacity: 0,
                        scale: 0.95,
                      }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-300"
                    >
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">
                          {error}
                        </span>
                      </div>
                    </motion.div>
                  )}

                  <motion.div
                    className="space-y-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <FormField
                      id="settings-name"
                      label="Name"
                      value={settingsForm.name}
                      onChange={(value) =>
                        handleSettingsChange(
                          "name",
                          value
                        )
                      }
                      placeholder="Enter problem name"
                      required
                      maxLength={100}
                    />

                    <FormField
                      id="settings-platform"
                      label="Platform"
                      value={settingsForm.platform}
                      onChange={(value) =>
                        handleSettingsChange(
                          "platform",
                          value
                        )
                      }
                      placeholder="e.g., LeetCode, HackerRank"
                      maxLength={50}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="settings-difficulty"
                          className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block"
                        >
                          Difficulty
                        </label>
                        <Select
                          value={settingsForm.difficulty}
                          onValueChange={(
                            v: Difficulty
                          ) =>
                            handleSettingsChange(
                              "difficulty",
                              v
                            )
                          }
                        >
                          <SelectTrigger
                            id="settings-difficulty"
                            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700">
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

                      <div>
                        <label
                          htmlFor="settings-status"
                          className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block"
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
                          <SelectTrigger
                            id="settings-status"
                            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700">
                            {STATUS_OPTIONS.map(
                              (s) => (
                                <SelectItem
                                  key={s}
                                  value={s}
                                >
                                  {s}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <FormField
                      id="settings-category"
                      label="Categories"
                      value={settingsForm.category}
                      onChange={(value) =>
                        handleSettingsChange(
                          "category",
                          value
                        )
                      }
                      placeholder="Arrays, Dynamic Programming, Trees"
                      maxLength={200}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Separate with commas
                    </p>
                  </motion.div>

                  <div className="flex justify-end gap-2 mt-6">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={
                          deleting || settingsSaving
                        }
                        className="bg-red-500 dark:bg-red-600 text-white hover:bg-red-600 dark:hover:bg-red-500 transition-all duration-200"
                        aria-label="Delete problem"
                      >
                        {deleting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <X className="w-4 h-4 mr-2" />
                            Delete
                          </>
                        )}
                      </Button>
                    </motion.div>
                    <Button
                      variant="outline"
                      onClick={handleSettingsReset}
                      className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                    >
                      Reset
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setSettingsOpen(false)
                      }
                      className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                    >
                      Cancel
                    </Button>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        onClick={handleSettingsSave}
                        disabled={
                          !settingsForm.name.trim() ||
                          settingsSaving ||
                          deleting
                        }
                        className="bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-500 transition-all duration-200"
                      >
                        {settingsSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Saving...
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                    </motion.div>
                  </div>
                </DialogContent>
              </Dialog>

              <motion.div
                animate={{ rotate: open ? 180 : 0 }}
                transition={{
                  duration: 0.3,
                  ease: "easeInOut",
                }}
              >
                <ChevronDown
                  className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors"
                  aria-hidden="true"
                />
              </motion.div>
            </div>
          </div>
        </CollapsibleTrigger>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <CollapsibleContent
                id={`collapsible-content-${problem.id}`}
                className="overflow-auto"
              >
                <motion.div
                  className="px-6 pb-6 space-y-4 border-t border-gray-100 dark:border-gray-700"
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  {error && (
                    <motion.div
                      initial={{
                        opacity: 0,
                        scale: 0.95,
                      }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-300"
                    >
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">
                          {error}
                        </span>
                      </div>
                    </motion.div>
                  )}

                  <div className="space-y-4">
                    <FormField
                      id={`notes-${problem.id}`}
                      label="📝 Notes"
                      value={editableForm.notes}
                      onChange={(value) =>
                        handleEditableChange(
                          "notes",
                          value
                        )
                      }
                      placeholder="Key insights, approach, time/space complexity..."
                      type="textarea"
                      maxLength={MAX_INPUT_LENGTH}
                      onBlur={savePendingChanges}
                    />

                    <FormField
                      id={`mistakes-${problem.id}`}
                      label="❌ Mistakes Made"
                      value={editableForm.mistakesMade}
                      onChange={(value) =>
                        handleEditableChange(
                          "mistakesMade",
                          value
                        )
                      }
                      placeholder="Common pitfalls, edge cases missed, debugging notes..."
                      type="textarea"
                      maxLength={MAX_INPUT_LENGTH}
                      onBlur={savePendingChanges}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                    <AnimatePresence mode="wait">
                      {saving && (
                        <motion.div
                          initial={{
                            opacity: 0,
                            x: -10,
                          }}
                          animate={{
                            opacity: 1,
                            x: 0,
                          }}
                          exit={{
                            opacity: 0,
                            x: -10,
                          }}
                          className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400"
                        >
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Saving...</span>
                        </motion.div>
                      )}
                      {lastSaved && !saving && (
                        <motion.div
                          initial={{
                            opacity: 0,
                            x: -10,
                          }}
                          animate={{
                            opacity: 1,
                            x: 0,
                          }}
                          exit={{
                            opacity: 0,
                            x: -10,
                          }}
                          className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400"
                        >
                          <Check className="w-3 h-3" />
                          <span>
                            Saved{" "}
                            {formatLastSaved(
                              lastSaved
                            )}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      Auto-saves after 1 second or on blur
                    </span>
                  </div>
                </motion.div>
              </CollapsibleContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Collapsible>
    </motion.div>
  )
}