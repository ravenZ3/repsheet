'use client'

import { useState } from "react"
import SearchBar from "./SearchBar"
import ProblemRow from "./ProblemRow"
import { motion, AnimatePresence } from "framer-motion"

export default function ProblemsPage({ initialProblems }: { initialProblems: any[] }) {
  const [problems, setProblems] = useState(initialProblems)
  const [filteredProblems, setFilteredProblems] = useState(initialProblems)

  const handleProblemUpdate = (id: string, updates: any) => {
    setProblems(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <SearchBar problems={problems} onResults={setFilteredProblems} />
      
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredProblems.map((problem) => (
            <ProblemRow
              key={problem.id}
              problem={problem}
              onUpdate={handleProblemUpdate}
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
