//app/review/page.tsx
import { PrismaClient, Problem } from '@prisma/client' 
import { format, startOfDay, endOfDay } from 'date-fns'
import ReviewPageContent from '@/components/ReviewPageContent'

// Initialize Prisma client
const prisma = new PrismaClient()

export default async function ReviewPage() {
  const today = new Date()


  let problems: Problem[] = []
  let totalCount = 0
  let reviewedToday = 0
  let error: string | null = null

  try {

    [problems, totalCount, reviewedToday] = await Promise.all([
      prisma.problem.findMany({
        where: {
          userId: process.env.USER_ID,
          nextReviewDate: { lte: today },
        },
        orderBy: { nextReviewDate: 'asc' },
      }),
      prisma.problem.count({
        where: { userId: process.env.USER_ID },
      }),
      prisma.problem.count({
        where: {
          userId: process.env.USER_ID,
          nextReviewDate: {
            gte: startOfDay(today),
            lte: endOfDay(today),
          },
        },
      }),
    ])
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to fetch problems'
  } finally {
    await prisma.$disconnect()
  }

  // Your ReviewPageContent component will receive the correctly typed 'problems'
  return (
    <ReviewPageContent
      problems={problems}
      totalCount={totalCount}
      reviewedToday={reviewedToday}
      error={error}
    />
  )
}