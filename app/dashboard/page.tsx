import prisma from "@/lib/prisma"
import { format } from "date-fns"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { redirect } from "next/navigation"
import DashboardCharts from "@/components/DashboardCharts"

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ platform?: string }> }) {
	const session = await getServerSession(authOptions)
	if (!session || !session.user?.id) {
		redirect("/login")
	}

    const resolvedParams = await searchParams;
    const platformFilter = resolvedParams.platform || 'All';

	const user = await prisma.user.findUnique({
		where: { id: session.user.id },
		select: { dailyReviewLimit: true },
	})
	const limit = user?.dailyReviewLimit || 20;

    const baseWhere: any = { userId: session.user.id };
    if (platformFilter && platformFilter !== 'All') {
        baseWhere.platform = platformFilter;
    }

	const problems = await prisma.problem.findMany({
		where: baseWhere,
		select: { id: true, name: true, isStuck: true, difficulty: true, dateSolved: true, nextReviewDate: true, lastReview: true, platform: true, platformRating: true },
	})

	const now = new Date();
	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

	let totalDue = 0;
	let reviewedToday = 0;

	for (const p of problems) {
		if (p.nextReviewDate && p.nextReviewDate <= now) {
			totalDue++;
		}
		if (p.lastReview && p.lastReview >= todayStart && p.lastReview < todayEnd) {
			reviewedToday++;
		}
	}

	const cappedDue = Math.min(totalDue, limit);
	const backlog = Math.max(0, totalDue - cappedDue);
	const daysToClear = limit > 0 && backlog > 0 ? Math.ceil(backlog / limit) : 0;

	const progress = {
		dueToday: cappedDue,
		reviewedToday: reviewedToday,
		backlog: backlog,
		daysToClear: daysToClear,
        limit: limit
	};

	const countBy = (key: "difficulty") => {
		const result: Record<string, number> = {}
		for (const p of problems) {
			const k = p[key as keyof typeof p] || "Unknown"
			result[k as string] = (result[k as string] || 0) + 1
		}
		return Object.entries(result).map(([name, value]) => ({ name, value }))
	}

	const countElo = () => {
		const result: Record<string, number> = {}
		for (const p of problems) {
			if (p.platformRating != null) {
                const bracket = Math.floor(p.platformRating / 100) * 100;
				result[bracket.toString()] = (result[bracket.toString()] || 0) + 1
			}
		}
		return Object.entries(result).map(([name, value]) => ({ name, value })).sort((a,b) => parseInt(a.name) - parseInt(b.name));
	}

    const stuckCount = problems.filter(p => p.isStuck).length;
    const flowingCount = problems.length - stuckCount;
    const statusData = [
        { name: "Stuck", value: stuckCount },
        { name: "Flowing", value: flowingCount }
    ];

	const heatmap = problems.reduce((acc, p) => {
		if (!p.dateSolved) return acc
		const key = format(new Date(p.dateSolved), "yyyy-MM-dd")
        if (!acc[key]) acc[key] = { count: 0, problems: [] }
		acc[key].count += 1
        acc[key].problems.push({ id: p.id, name: p.name, platform: p.platform, difficulty: p.difficulty, platformRating: p.platformRating })
		return acc
	}, {} as Record<string, { count: number, problems: { id: string, name: string, platform: string | null, difficulty: string, platformRating?: number | null }[] }>)

	const heatmapArray = Object.entries(heatmap).map(([date, data]) => ({
		date,
		count: data.count,
        problems: data.problems
	}))

	const data = {
		status: statusData,
		difficulty: countBy("difficulty"),
		heatmap: heatmapArray,
        eloDistribution: countElo()
	}

	return (
		<div className="max-w-7xl mx-auto mt-6 px-4 space-y-6">
			<div className="flex flex-col md:flex-row md:items-baseline md:justify-between px-2">
				<h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
					Dashboard
				</h1>
				<p className="text-gray-500 dark:text-gray-400 font-medium text-sm mt-1 md:mt-0 tracking-wide">
					Spaced repetition for competitive programming
				</p>
			</div>
			<DashboardCharts data={data} progress={progress} />
		</div>
	)
}
