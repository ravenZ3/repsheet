import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { format } from "date-fns"

const prisma = new PrismaClient()

export async function GET() {
	const userId = "64d1f0f33a1c2b5e5cabc123"

	const problems = await prisma.problem.findMany({
		where: { userId },
		select: { status: true, difficulty: true, dateSolved: true },
	})

	const countBy = (key: "status" | "difficulty") => {
		const result: Record<string, number> = {}
		for (const p of problems) {
			const k = p[key] || "Unknown"
			result[k] = (result[k] || 0) + 1
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

	return NextResponse.json({
		status: countBy("status"),
		difficulty: countBy("difficulty"),
		heatmap: heatmapArray,
	})
}
