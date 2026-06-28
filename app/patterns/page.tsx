import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/authOptions"
import prisma from "@/lib/prisma"
import { getCatalog } from "@/lib/patterns"
import { buildPatternView } from "@/lib/patterns/match"
import PatternsClient from "./PatternsClient"

export default async function PatternsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { showPatterns: true },
  })
  if (!user?.showPatterns) redirect("/dashboard")

  const problems = await prisma.problem.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true, link: true, platform: true, nextReviewDate: true, lastRating: true },
  })

  const patterns = buildPatternView(getCatalog(), problems, new Date())
  return <PatternsClient patterns={patterns} />
}
