import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 14)

  const problems = await prisma.problem.findMany({
    where: {
      lastReview: { gte: cutoff },
    },
    select: { id: true, userId: true, lastReview: true, lastRating: true },
  })

  console.log(`Found ${problems.length} problems with recent reviews`)

  let created = 0
  for (const p of problems) {
    if (!p.lastReview) continue
    await prisma.review.create({
      data: {
        userId: p.userId,
        problemId: p.id,
        date: p.lastReview,
        rating: p.lastRating ?? 3,
      },
    })
    created++
  }

  console.log(`Created ${created} Review documents`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
