"use client" // Error components must be Client Components

import { useEffect } from "react"
import { AlertCircle } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex h-[70vh] flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="w-16 h-16 text-red-500 mb-6" />
      <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        Something went wrong!
      </h2>
      <p className="text-gray-600 dark:text-gray-400 max-w-md mb-8">
        {error.message || "An unexpected application error occurred."}
      </p>
      <button
        onClick={() => reset()}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
      >
        Try again
      </button>
    </div>
  )
}
