import React from "react"

export default function DashboardLoading() {
  return (
    <div className="max-w-7xl mx-auto mt-10 px-4">
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-md w-64 mb-2 mx-auto"></div>
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-md w-96 mb-8 mx-auto"></div>
        
        {/* Main Panel Skeletons */}
        <div className="w-full min-h-[800px] rounded-lg border dark:border-gray-700 flex flex-col md:flex-row shadow-sm">
          <div className="flex-1 p-6 border-r dark:border-gray-700">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-8"></div>
            <div className="h-64 w-64 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto"></div>
          </div>
          <div className="flex-1 p-6">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-56 mb-8"></div>
            <div className="h-72 w-full rounded-md bg-gray-200 dark:bg-gray-700"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
