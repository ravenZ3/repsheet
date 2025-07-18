"use client"

import { useState, useCallback } from "react"
import SearchBar from "./SearchBar"
import ProblemRow from "./ProblemRow"
import { motion, AnimatePresence } from "framer-motion"
import type { Problem } from "@prisma/client"

export default function ProblemsPage({ initialProblems }: { initialProblems: Problem[] }) {
  const [problems, setProblems] = useState<Problem[]>(initialProblems)
  const [filteredProblems, setFilteredProblems] = useState<Problem[]>(initialProblems)

  // FIX: Updated the function to handle both updates (Partial<Problem>) and deletions (null).
  const handleProblemUpdate = useCallback((id: string, updates: Partial<Problem> | null) => {
    if (updates === null) {
      // This is a deletion signal.
      setProblems(prev => prev.filter(p => p.id !== id));
      setFilteredProblems(prev => prev.filter(p => p.id !== id));
    } else {
      // This is an update.
      setProblems(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
      setFilteredProblems(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
    }
  }, []); // useCallback dependencies are empty as it doesn't rely on external state

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* SearchBar now receives the master list of problems for filtering */}
      <SearchBar problems={problems} onResults={setFilteredProblems} />
      
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredProblems.map((problem) => (
            <ProblemRow
              key={problem.id}
              problem={problem}
              onUpdate={handleProblemUpdate} // This is now fully type-compatible
            />
          ))}
        </AnimatePresence>

        {filteredProblems.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-slate-500"
          >
            <p>No problems found matching your criteria.</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}