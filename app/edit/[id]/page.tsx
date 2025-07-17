'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PrismaClient } from '@prisma/client'
import { notFound } from 'next/navigation'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { AlertCircle, Loader2 } from "lucide-react"
import CategoryAutocomplete from "@/components/CategoryAutocomplete"

// Constants
const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard'] as const
const STATUS_OPTIONS = ['To Revise', 'Stuck', 'Solved', 'Revisited'] as const

// Type definitions
type Difficulty = typeof DIFFICULTY_OPTIONS[number]
type Status = typeof STATUS_OPTIONS[number]

interface Problem {
  id: string
  problemId: string
  name: string
  platform: string
  link: string
  difficulty: Difficulty
  status: Status
  category: string[]
  dateSolved?: string
}

interface FormFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  type?: 'input' | 'date'
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
  type = 'input',
  maxLength,
  id,
  error,
}: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`transition-all duration-200 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 ${error ? 'border-red-500' : ''}`}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <div id={`${id}-error`} className="text-sm text-red-500 dark:text-red-400 flex items-center gap-1 mt-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  )
}

const prisma = new PrismaClient()

export default async function EditPage({ params }: { params: { id: string } }) {
  const problem = await prisma.problem.findUnique({ where: { id: params.id } })
  if (!problem) return notFound()

  return <EditProblemCard problem={problem} />
}

function EditProblemCard({ problem }: { problem: Problem }) {
  const router = useRouter()
  const [form, setForm] = useState({
    problemId: problem.problemId,
    name: problem.name,
    platform: problem.platform,
    link: problem.link,
    difficulty: problem.difficulty,
    status: problem.status,
    category: problem.category.join(', '),
    dateSolved: problem.dateSolved || '',
  })
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [submitting, setSubmitting] = useState(false)

  // Validate form fields
  const validateForm = useCallback((formData: typeof form) => {
    const newErrors: Partial<Record<string, string>> = {}
    if (!formData.problemId.trim()) {
      newErrors.problemId = 'Problem ID is required'
    }
    if (!formData.name.trim()) {
      newErrors.name = 'Problem name is required'
    }
    if (!formData.category.trim()) {
      newErrors.category = 'At least one category is required'
    }
    if (formData.link && !/^(https?:\/\/)/i.test(formData.link)) {
      newErrors.link = 'Link must be a valid URL'
    }
    if (formData.dateSolved && isNaN(new Date(formData.dateSolved).getTime())) {
      newErrors.dateSolved = 'Invalid date format'
    }
    return newErrors
  }, [])

  // Handle form field changes
  const handleChange = useCallback((name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }, [])

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    const newErrors = validateForm(form)
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast.error('Please fix the form errors')
      return
    }

    setSubmitting(true)
    setErrors({})

    try {
      const response = await fetch(`/api/problem/${problem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          category: form.category.split(',').map((t) => t.trim()).filter(Boolean),
          dateSolved: form.dateSolved || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to update: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      if (!result) {
        throw new Error('Invalid response from server')
      }

      toast.success('Problem updated successfully')
      router.push('/review')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update problem'
      console.error('Update error:', errorMessage)
      setErrors({ form: errorMessage })
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }, [form, problem.id, router, validateForm])

  // Reset form to original values
  const handleReset = useCallback(() => {
    setForm({
      problemId: problem.problemId,
      name: problem.name,
      platform: problem.platform,
      link: problem.link,
      difficulty: problem.difficulty,
      status: problem.status,
      category: problem.category.join(', '),
      dateSolved: problem.dateSolved || '',
    })
    setErrors({})
    toast.info('Form reset to original values')
  }, [problem])

  // Cancel and navigate back
  const handleCancel = useCallback(() => {
    router.back()
  }, [router])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="max-w-xl mx-auto mt-10 p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-lg"
    >
      <h1 className="text-xl mb-4 font-semibold text-gray-800 dark:text-gray-100">Edit Problem</h1>

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

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          id="problemId"
          label="Problem ID"
          value={form.problemId}
          onChange={(value) => handleChange('problemId', value)}
          placeholder="e.g., 1234, A1"
          required
          maxLength={50}
          error={errors.problemId}
        />

        <FormField
          id="name"
          label="Problem Name"
          value={form.name}
          onChange={(value) => handleChange('name', value)}
          placeholder="Enter problem name"
          required
          maxLength={100}
          error={errors.name}
        />

        <FormField
          id="platform"
          label="Platform"
          value={form.platform}
          onChange={(value) => handleChange('platform', value)}
          placeholder="e.g., LeetCode, Codeforces"
          maxLength={50}
          error={errors.platform}
        />

        <FormField
          id="link"
          label="Problem Link"
          value={form.link}
          onChange={(value) => handleChange('link', value)}
          placeholder="https://..."
          maxLength={200}
          error={errors.link}
        />

        <CategoryAutocomplete
          id="category"
          value={form.category}
          onChange={(value) => handleChange('category', value)}
          error={errors.category}
        />

        <div>
          <label htmlFor="difficulty" className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
            Difficulty
          </label>
          <Select value={form.difficulty} onValueChange={(value) => handleChange('difficulty', value)}>
            <SelectTrigger
              id="difficulty"
              className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700">
              {DIFFICULTY_OPTIONS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="status" className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
            Status
          </label>
          <Select value={form.status} onValueChange={(value) => handleChange('status', value)}>
            <SelectTrigger
              id="status"
              className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700">
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <FormField
          id="dateSolved"
          label="Date Solved"
          value={form.dateSolved}
          onChange={(value) => handleChange('dateSolved', value)}
          type="date"
          error={errors.dateSolved}
        />

        <div className="flex justify-end gap-2 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="transition-all duration-200 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            disabled={submitting}
          >
            Reset
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="transition-all duration-200 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            disabled={submitting}
          >
            Cancel
          </Button>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              type="submit"
              disabled={submitting}
              className="transition-all duration-200 bg-blue-600 dark:bg-blue-600 text-white hover:bg-blue-500 dark:hover:bg-blue-500"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                'Update Problem'
              )}
            </Button>
          </motion.div>
        </div>
      </form>
    </motion.div>
  )
}