// app/components/ReviewPageContent.tsx

"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from 'react';
// 1. Import useRouter from next/navigation
import { useRouter } from 'next/navigation';
import type { Problem } from "@prisma/client"
import ProblemReviewCard from './ProblemReviewCard';

interface ReviewPageContentProps {
  problems: Problem[];
  totalCount: number;
  reviewedToday: number;
  error: string | null;
}

export default function ReviewPageContent({
  problems: initialProblems,
  totalCount,
  reviewedToday: initialReviewedToday,
  error,
}: ReviewPageContentProps) {

  // 2. Instantiate the router
  const router = useRouter();
  const [problems, setProblems] = useState<Problem[]>(initialProblems);
  const [reviewedCount, setReviewedCount] = useState<number>(initialReviewedToday);

  const handleProblemUpdate = (
    updatedProblemId: string,
    updates: Partial<Problem> | null
  ) => {
    // Instant client-side feedback for a great UX
    setReviewedCount(currentCount => currentCount + 1);
    setProblems(currentProblems =>
      currentProblems.filter(p => p.id !== updatedProblemId)
    );

    // 3. Trigger a server data refresh
    // This will re-run the `app/review/page.tsx` data fetching
    // and update any part of the UI that depends on it,
    // including layouts, without a full page reload.
    router.refresh();
  };

  if (error) {
    return <p className="text-center text-red-500 py-8">Error: {error}</p>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
			<Card className="bg-white/40 dark:bg-white/10 border-gray-300 dark:border-gray-700 backdrop-blur-lg mb-8">
				<CardHeader>
					<CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
						📊 Progress Today
					</CardTitle>
				</CardHeader>
				<CardContent className="text-gray-800 dark:text-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
					<div className="text-center">
						<p className="text-2xl font-bold">{problems.length}</p>
						<p className="text-sm text-gray-600 dark:text-gray-400">Due Today</p>
					</div>
					<div className="text-center">
						<p className="text-2xl font-bold">{reviewedCount}</p>
						<p className="text-sm text-gray-600 dark:text-gray-400">Reviewed Today</p>
					</div>
					<div className="text-center">
						<p className="text-2xl font-bold">{totalCount}</p>
						<p className="text-sm text-gray-600 dark:text-gray-400">Total Problems</p>
					</div>
				</CardContent>
			</Card>
      
      <ul className="space-y-4">
        {problems.length > 0 ? (
          problems.map(problem => (
            <ProblemReviewCard
              key={problem.id}
              problem={problem}
              onUpdate={handleProblemUpdate}
            />
          ))
        ) : (
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              All Done for Today!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              You've reviewed {reviewedCount} problem(s) today. Come back tomorrow for more!
            </p>
          </div>
        )}
      </ul>
    </div>
  );
}