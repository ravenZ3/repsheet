import prisma from "@/lib/prisma"
import { format } from "date-fns"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { redirect } from "next/navigation"
import DashboardCharts from "@/components/DashboardCharts"

export default async function DashboardPage() {
	const session = await getServerSession(authOptions)
	if (!session || !session.user?.id) {
		redirect("/login")
	}

	const problems = await prisma.problem.findMany({
		where: { userId: session.user.id },
		select: { status: true, difficulty: true, dateSolved: true },
	})

	const countBy = (key: "status" | "difficulty") => {
		const result: Record<string, number> = {}
		for (const p of problems) {
			const k = p[key as keyof typeof p] || "Unknown"
			result[k as string] = (result[k as string] || 0) + 1
		}
		return Object.entries(result).map(([name, value]) => ({ name, value }))
	}

	const heatmap = problems.reduce((acc, p) => {
		if (!p.dateSolved) return acc
		const key = format(new Date(p.dateSolved), "yyyy-MM-dd")
		acc[key] = (acc[key] || 0) + 1
		return acc
	}, {} as Record<string, number>)

	const heatmapArray = Object.entries(heatmap).map(([date, count]) => ({
		date,
		count,
	}))

	const data = {
		status: countBy("status"),
		difficulty: countBy("difficulty"),
		heatmap: heatmapArray,
	}

	return (
		<div className="max-w-7xl mx-auto mt-10 px-4 space-y-8">
			<div className="text-center">
				<h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
					Repsheet Dashboard
				</h1>
				<p className="text-gray-600 dark:text-gray-400">
					Track your coding progress and performance metrics
				</p>
			</div>
			<DashboardCharts data={data} />
		</div>
	)
}
