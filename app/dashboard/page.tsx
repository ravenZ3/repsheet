import { Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"
import { format } from "date-fns"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { redirect } from "next/navigation"
import DashboardCharts from "@/components/DashboardCharts"
import OnboardingPanel from "@/components/OnboardingPanel"
import FocusChips from "@/components/FocusChips"
import { resolveFocusChips } from "@/lib/focusChips"

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ platform?: string }> }) {
	const session = await getServerSession(authOptions)
	if (!session || !session.user?.id) {
		redirect("/login")
	}

	const totalProblemCount = await prisma.problem.count({ where: { userId: session.user.id } })
	if (totalProblemCount === 0) {
		return <OnboardingPanel />
	}

    const resolvedParams = await searchParams;
    const platformFilter = resolvedParams.platform || 'All';

    const baseWhere: Prisma.ProblemWhereInput = { userId: session.user.id };
    if (platformFilter && platformFilter !== 'All') {
        baseWhere.platform = platformFilter;
    }

	const now = new Date();
	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
	const thresholdTime = todayStart.getTime() - 91 * 24 * 60 * 60 * 1000;
	const thresholdDate = new Date(thresholdTime);

	// Independent reads — fetch in parallel.
	const [user, problems, reviews] = await Promise.all([
		prisma.user.findUnique({
			where: { id: session.user.id },
			select: { dailyReviewLimit: true, focusTags: true },
		}),
		prisma.problem.findMany({
			where: baseWhere,
			select: { id: true, name: true, isStuck: true, difficulty: true, dateSolved: true, nextReviewDate: true, lastReview: true, platform: true, platformRating: true, category: true, fsrsState: true, link: true },
		}),
		prisma.review.findMany({
			where: {
				userId: session.user.id,
				date: { gte: thresholdDate },
			},
			select: { date: true },
		}),
	])
	const limit = user?.dailyReviewLimit || 20;
	const focusChips = resolveFocusChips(user?.focusTags ?? []);

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
		dueToday: Math.max(0, cappedDue - reviewedToday),
		reviewedToday: reviewedToday,
		backlog: backlog,
		daysToClear: daysToClear,
        limit: limit,
        relearningCount: problems.filter(p => p.fsrsState === 3).length
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

    const computeSkills = () => {
        const skillsMap: Record<string, number> = {};
        for (const p of problems) {
            if (p.category && Array.isArray(p.category)) {
                for (const cat of p.category) {
                    skillsMap[cat] = (skillsMap[cat] || 0) + 1;
                }
            }
        }
        return Object.entries(skillsMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    };

    const stuckCount = problems.filter(p => p.isStuck).length;
    const flowingCount = problems.length - stuckCount;
    const statusData = [
        { name: "Stuck", value: stuckCount },
        { name: "Flowing", value: flowingCount }
    ];

    const reviewsByDay: Record<string, number> = {}
    for (const r of reviews) {
        const key = format(new Date(r.date).getTime(), "yyyy-MM-dd")
        reviewsByDay[key] = (reviewsByDay[key] || 0) + 1
    }

	// The rendered heatmap only spans the last 90 days, so skip older solves up
	// front instead of bucketing all history and discarding it afterwards.
	const heatmap = problems.reduce((acc, p) => {
		if (!p.dateSolved) return acc
        const solvedTime = new Date(p.dateSolved).getTime();
        if (solvedTime < thresholdTime) return acc
		const key = format(solvedTime, "yyyy-MM-dd")
        if (!acc[key]) acc[key] = { count: 0, problems: [] }
		acc[key].count += 1
        acc[key].problems.push({ id: p.id, name: p.name, platform: p.platform, difficulty: p.difficulty, platformRating: p.platformRating, link: p.link })
		return acc
	}, {} as Record<string, { count: number, problems: { id: string, name: string, platform: string | null, difficulty: string, platformRating?: number | null, link: string | null }[] }>)

	const heatmapArray = Object.entries(heatmap)
      .map(([date, data]) => ({
		  date,
		  count: data.count,
          reviewCount: reviewsByDay[date] || 0,
          problems: data.problems
	  }))

    // Add review-only days (days with reviews but no solves)
    for (const [date, reviewCount] of Object.entries(reviewsByDay)) {
        if (!heatmapArray.find(h => h.date === date)) {
            heatmapArray.push({ date, count: 0, reviewCount, problems: [] })
        }
    }

	const data = {
		status: statusData,
		difficulty: countBy("difficulty"),
		heatmap: heatmapArray,
        eloDistribution: countElo(),
        skills: computeSkills()
	}

	return (
		<div className="max-w-7xl mx-auto mt-6 px-4 space-y-6">
			<div className="flex flex-col md:flex-row md:items-baseline md:justify-between px-2">
				<h1 className="text-3xl italic text-gray-900 dark:text-white [font-family:var(--font-playfair)]">
					Dashboard
				</h1>
				<p className="text-gray-500 dark:text-gray-400 font-medium text-sm mt-1 md:mt-0 tracking-wide">
					Spaced repetition for competitive programming
				</p>
			</div>
			{focusChips.length > 0 && (
				<div className="px-2">
					<FocusChips chips={focusChips} />
				</div>
			)}
			<DashboardCharts data={data} progress={progress} />
		</div>
	)
}
