'use client'

import { useEffect, useMemo, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"

const CATEGORY_SUGGESTIONS = [
  "Arrays",
  "Strings",
  "Dynamic Programming",
  "Graphs",
  "Trees",
  "Linked Lists",
  "Hash Tables",
  "Binary Search",
  "Sorting",
  "Greedy",
  "Backtracking",
  "Bit Manipulation",
  "Math",
  "Stacks",
  "Queues",
]

export default function CategoryAutocomplete({
  value,
  onChange,
  error,
  id,
}: {
  value: string
  onChange: (value: string) => void
  error?: string
  id: string
}) {
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const lastInput = value.split(",").slice(-1)[0].trim().toLowerCase()

  const filteredSuggestions = useMemo(() => {
    const alreadyUsed = value
      .split(",")
      .slice(0, -1)
      .map((t) => t.trim().toLowerCase())

    return CATEGORY_SUGGESTIONS.filter(
      (cat) =>
        !alreadyUsed.includes(cat.toLowerCase()) &&
        cat.toLowerCase().includes(lastInput)
    )
  }, [value, lastInput])

  const handleSelect = (selected: string) => {
    const parts = value.split(",").map((t) => t.trim())
    parts[parts.length - 1] = selected
    const updated = [...new Set(parts)].join(", ") + ", "
    onChange(updated)
    setOpen(false)
    setHighlightedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightedIndex((i) =>
        i < filteredSuggestions.length - 1 ? i + 1 : i
      )
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightedIndex((i) => (i > 0 ? i - 1 : -1))
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault()
      handleSelect(filteredSuggestions[highlightedIndex])
    }
  }

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      <label
        htmlFor={id}
        className="text-[13px] font-semibold text-gray-700 dark:text-[#888] tracking-wide block"
      >
        Categories <span className="text-rose-500/80">*</span>
      </label>
      <Input
        ref={inputRef}
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Arrays, Dynamic Programming, Trees"
        className={`transition-all duration-200 focus:ring-0 bg-gray-50/50 dark:bg-white/[0.02] text-gray-900 dark:text-[rgba(255,255,255,0.9)] border-gray-200 dark:border-white/[0.06] focus:border-gray-400 dark:focus:border-white/[0.2] text-[13px] h-9 ${
          error ? "border-red-500/50 dark:border-rose-500/50" : ""
        }`}
      />

      <AnimatePresence>
        {open && filteredSuggestions.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="border rounded-[10px] mt-1 bg-white dark:bg-[#111] border-gray-200 dark:border-white/[0.08] z-20 absolute w-[300px] max-h-[200px] overflow-y-auto shadow-2xl"
          >
            <div className="p-1">
              {filteredSuggestions.map((cat, i) => (
                <li
                  key={cat}
                  className={`px-3 py-1.5 text-[13px] rounded-md cursor-pointer transition-colors text-gray-900 dark:text-[rgba(255,255,255,0.9)] ${
                    i === highlightedIndex
                      ? "bg-gray-100 dark:bg-white/[0.08]"
                      : "hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                  }`}
                  onClick={() => handleSelect(cat)}
                >
                  {cat}
                </li>
              ))}
            </div>
          </motion.ul>
        )}
      </AnimatePresence>

      {error && (
        <p className="text-sm text-red-500 mt-1 dark:text-red-400">
          {error}
        </p>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Separate multiple categories with commas
      </p>
    </div>
  )
}
