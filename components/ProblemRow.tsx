'use client'

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
import { ChevronDown, Check, AlertCircle, Loader2, Settings, X } from "lucide-react"
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
import isEqual from "lodash/isEqual"

// Constants
const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard'] as const
const STATUS_OPTIONS = ['Pending', 'Solved', 'Review'] as const
const MAX_INPUT_LENGTH = 1000 // Max length for text inputs
const DEBOUNCE_DELAY = 1000 // Debounce delay in ms

// Type definitions
type Difficulty = typeof DIFFICULTY_OPTIONS[number]
type Status = typeof STATUS_OPTIONS[number]

interface Problem {
  id: string
  name: string
  platform: string
  difficulty: Difficulty
  status: Status
  category: string[]
  notes?: string
  mistakesMade?: string
}

interface ProblemRowProps {
  problem: Problem
  onUpdate?: (id: string, updates: Partial<Problem>) => void
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

// Reusable FormField component
interface FormFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  type?: 'input' | 'textarea'
  maxLength?: number
  id: string
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = 'input',
  maxLength,
  id,
}: FormFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-slate-700 mb-2 block">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {type === 'input' ? (
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
          aria-required={required}
        />
      ) : (
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={3}
          className="resize-none transition-all duration-200 focus:ring-2 focus:ring-blue-500"
          aria-required={required}
        />
      )}
    </div>
  )
}

/**
 * ProblemRow component for displaying and editing a problem's details
 * @param problem - The problem data
 * @param onUpdate - Callback to handle updates to the problem
 */
export default function ProblemRow({ problem, onUpdate }: ProblemRowProps) {
  const [open, setOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editableForm, setEditableForm] = useState<EditableForm>({
    notes: problem.notes || '',
    mistakesMade: problem.mistakesMade || '',
  })
  const [settingsForm, setSettingsForm] = useState<SettingsForm>({
    name: problem.name,
    platform: problem.platform,
    difficulty: problem.difficulty,
    status: problem.status,
    category: problem.category.join(', '),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [settingsSaving, setSettingsSaving] = useState(false)

  // Memoized status styling
  const statusStyle = useMemo(() => {
    switch (problem.status) {
      case 'Solved':
        return { color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' }
      case 'Review':
        return { color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' }
      case 'Pending':
        return { color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' }
      default:
        return { color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' }
    }
  }, [problem.status])

  // Memoized difficulty styling
  const difficultyStyle = useMemo(() => {
    switch (problem.difficulty) {
      case 'Easy':
        return { color: 'text-green-600', bg: 'bg-green-50 border-green-200' }
      case 'Medium':
        return { color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' }
      case 'Hard':
        return { color: 'text-red-600', bg: 'bg-red-50 border-red-200' }
      default:
        return { color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' }
    }
  }, [problem.difficulty])

  // Debounced saveChanges function
  const saveChanges = useMemo(
    () =>
      debounce(async (updates: Partial<Problem>) => {
        setSaving(true)
        setError(null)

        try {
          const response = await fetch(`/api/problem/${problem.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          })

          if (!response.ok) {
            throw new Error(`Failed to save: ${response.statusText}`)
          }

          const updatedProblem = await response.json()
          setLastSaved(new Date())
          onUpdate?.(problem.id, updatedProblem)
          toast.success('Changes saved successfully')
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to save changes'
          setError(errorMessage)
          toast.error(errorMessage)
        } finally {
          setSaving(false)
        }
      }, DEBOUNCE_DELAY),
    [problem.id, onUpdate]
  )

  // Stable event handlers
  const handleEditableChange = useCallback((key: keyof EditableForm, value: string) => {
    setEditableForm((prev) => ({ ...prev, [key]: value.slice(0, MAX_INPUT_LENGTH) }))
    setError(null)
  }, [])

  const handleSettingsChange = useCallback((key: keyof SettingsForm, value: string) => {
    setSettingsForm((prev) => ({ ...prev, [key]: value }))
    setError(null)
  }, [])

  // Auto-save editable fields
  useEffect(() => {
    if (
      !isEqual(
        { notes: problem.notes || '', mistakesMade: problem.mistakesMade || '' },
        editableForm
      )
    ) {
      saveChanges(editableForm)
    }
  }, [editableForm, saveChanges, problem.notes, problem.mistakesMade])

  // Save settings changes
  const handleSettingsSave = useCallback(async () => {
    if (!settingsForm.name.trim()) {
      setError('Problem name is required')
      return
    }

    const categories = settingsForm.category
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    if (categories.length === 0) {
      setError('At least one category is required')
      return
    }

    setSettingsSaving(true)
    const updates: Partial<Problem> = {
      ...settingsForm,
      category: categories,
    }

    await saveChanges(updates)
    setSettingsSaving(false)
    setSettingsOpen(false)
  }, [settingsForm, saveChanges])

  // Reset settings form
  const handleSettingsReset = useCallback(() => {
    setSettingsForm({
      name: problem.name,
      platform: problem.platform,
      difficulty: problem.difficulty,
      status: problem.status,
      category: problem.category.join(', '),
    })
    setError(null)
  }, [problem])

  // Format last saved time
  const formatLastSaved = useCallback((date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return 'just now'
    if (minutes === 1) return '1 minute ago'
    if (minutes < 60) return `${minutes} minutes ago`
    return date.toLocaleTimeString()
  }, [])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <Collapsible
        open={open}
        onOpenChange={setOpen}
        className="group border border-slate-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
      >
        <CollapsibleTrigger
          asChild
          aria-expanded={open}
          aria-controls={`collapsible-content-${problem.id}`}
        >
          <div className="flex items-center justify-between p-6 cursor-pointer">
            <div className="flex-1 min-w-0">
              <motion.h3
                className="text-lg font-medium text-slate-800 group-hover:text-slate-900 transition-colors truncate"
                layoutId={`title-${problem.id}`}
              >
                {problem.name}
              </motion.h3>

              <div className="flex items-center gap-3 mt-2">
                <motion.span
                  className="text-sm text-slate-500"
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

              {problem.category.length > 0 && (
                <motion.div
                  className="flex flex-wrap gap-1 mt-2"
                  layoutId={`categories-${problem.id}`}
                >
                  {problem.category.slice(0, 3).map((cat, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md"
                    >
                      {cat}
                    </span>
                  ))}
                  {problem.category.length > 3 && (
                    <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs rounded-md">
                      +{problem.category.length - 3} more
                    </span>
                  )}
                </motion.div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Status indicators */}
              <AnimatePresence mode="wait">
                {saving && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  </motion.div>
                )}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  </motion.div>
                )}
                {lastSaved && !saving && !error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Check className="w-4 h-4 text-green-500" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Settings button */}
              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.05, rotate: 90 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Open problem settings"
                  >
                    <Settings className="w-4 h-4 text-slate-500" />
                  </motion.button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Problem Settings</DialogTitle>
                  </DialogHeader>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700"
                    >
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">{error}</span>
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
                      onChange={(value) => handleSettingsChange('name', value)}
                      placeholder="Enter problem name"
                      required
                      maxLength={100}
                    />

                    <FormField
                      id="settings-platform"
                      label="Platform"
                      value={settingsForm.platform}
                      onChange={(value) => handleSettingsChange('platform', value)}
                      placeholder="e.g., LeetCode, HackerRank"
                      maxLength={50}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="settings-difficulty"
                          className="text-sm font-medium text-slate-700 mb-2 block"
                        >
                          Difficulty
                        </label>
                        <Select
                          value={settingsForm.difficulty}
                          onValueChange={(v) => handleSettingsChange('difficulty', v)}
                        >
                          <SelectTrigger
                            id="settings-difficulty"
                            className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DIFFICULTY_OPTIONS.map((d) => (
                              <SelectItem key={d} value={d}>
                                {d}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label
                          htmlFor="settings-status"
                          className="text-sm font-medium text-slate-700 mb-2 block"
                        >
                          Status
                        </label>
                        <Select
                          value={settingsForm.status}
                          onValueChange={(v) => handleSettingsChange('status', v)}
                        >
                          <SelectTrigger
                            id="settings-status"
                            className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <FormField
                      id="settings-category"
                      label="Categories"
                      value={settingsForm.category}
                      onChange={(value) => handleSettingsChange('category', value)}
                      placeholder="Arrays, Dynamic Programming, Trees"
                      maxLength={200}
                    />
                    <p className="text-xs text-slate-500 mt-1">Separate with commas</p>
                  </motion.div>

                  <div className="flex justify-end gap-2 mt-6">
                    <Button
                      variant="outline"
                      onClick={handleSettingsReset}
                      className="transition-all duration-200 hover:bg-slate-50"
                    >
                      Reset
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSettingsOpen(false)}
                      className="transition-all duration-200 hover:bg-slate-50"
                    >
                      Cancel
                    </Button>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        onClick={handleSettingsSave}
                        disabled={!settingsForm.name.trim() || settingsSaving}
                        className="transition-all duration-200"
                      >
                        {settingsSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </Button>
                    </motion.div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Chevron */}
              <motion.div
                animate={{ rotate: open ? 180 : 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <ChevronDown
                  className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors"
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
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <CollapsibleContent id={`collapsible-content-${problem.id}`}>
                <motion.div
                  className="px-6 pb-6 space-y-4 border-t border-slate-100"
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700"
                    >
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">{error}</span>
                      </div>
                    </motion.div>
                  )}

                  <div className="space-y-4 pt-4 text-black">
                    <FormField
                      id={`notes-${problem.id}`}
                      label="📝 Notes"
                      value={editableForm.notes}
                      onChange={(value) => handleEditableChange('notes', value)}
                      placeholder="Key insights, approach, time/space complexity..."
                      type="textarea"
                      maxLength={MAX_INPUT_LENGTH}
                    />

                    <FormField
                      id={`mistakes-${problem.id}`}
                      label="❌ Mistakes Made"
                      value={editableForm.mistakesMade}
                      onChange={(value) => handleEditableChange('mistakesMade', value)}
                      placeholder="Common pitfalls, edge cases missed, debugging notes..."
                      type="textarea"
                      maxLength={MAX_INPUT_LENGTH}
                    />
                  </div>

                  {/* Status footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <AnimatePresence mode="wait">
                      {saving && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="flex items-center gap-2 text-sm text-blue-600"
                        >
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Saving...</span>
                        </motion.div>
                      )}
                      {lastSaved && !saving && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="flex items-center gap-2 text-sm text-green-600"
                        >
                          <Check className="w-3 h-3" />
                          <span>Saved {formatLastSaved(lastSaved)}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <span className="text-xs text-slate-400">
                      Auto-saves after 1 second
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