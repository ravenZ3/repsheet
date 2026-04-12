import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import ProblemsClient from "./ProblemsClient"

export default async function ProblemsPage({
	searchParams,
}: {
	searchParams: Promise<{ page?: string }>
}) {
	const session = await getServerSession(authOptions)
	if (!session?.user?.id) {
		redirect("/login")
	}

	// 1. Pagination Params
	const resolvedParams = await searchParams
	const page = parseInt(resolvedParams.page || "1", 10)
	const pageSize = 8

	// 2. Fetch Paginated Problems (Phase 1 Default View)
	const [paginatedProblems, totalProblems] = await Promise.all([
		prisma.problem.findMany({
			where: { userId: session.user.id },
			orderBy: { dateSolved: "desc" },
			skip: (page - 1) * pageSize,
			take: pageSize,
		}),
		prisma.problem.count({ where: { userId: session.user.id } }),
	])

	return (
		<div className="w-full">
			<ProblemsClient
				initialPaginatedProblems={paginatedProblems}
				totalProblems={totalProblems}
				currentPage={page}
				pageSize={pageSize}
			/>
		</div>
	)
}