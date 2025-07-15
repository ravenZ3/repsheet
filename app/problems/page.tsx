// app/problems/page.tsx
import ProblemsPage from "@/components/ProblemPage"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export default async function Page() {
  const userId = "64d1f0f33a1c2b5e5cabc123"

  const problems = await prisma.problem.findMany({
    where: { userId },
    orderBy: { dateSolved: "desc" },
  })

  return <ProblemsPage initialProblems={problems} />
}
