// app/problems/page.tsx
import ProblemsPage from "@/components/ProblemPage"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export default async function Page() {
  const userId = process.env.USER_ID

  const problems = await prisma.problem.findMany({
    where: { userId },
    orderBy: { dateSolved: "desc" },
  })

  return <ProblemsPage initialProblems={problems} />
}
