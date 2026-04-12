"use client"

import { useState, useMemo, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	Legend,
	AreaChart,
	Area,
	Cell
} from "recharts"

type ChartData = { name: string; value: number }[]
type HeatmapData = { date: string; count: number; problems?: { id: string; name: string; difficulty: string; platform?: string | null; platformRating?: number | null }[] }[]
export type DashboardData = {
	status: ChartData
	difficulty: ChartData
	heatmap: HeatmapData
    eloDistribution?: ChartData
}

export type ProgressData = {
	dueToday: number
	reviewedToday: number
	backlog: number
	daysToClear: number
    limit: number
}

interface TooltipPayload {
	name: string
	value: number | string
	payload: {
		solved?: number
		attempted?: number
	}
}

interface TooltipProps {
	active?: boolean
	payload?: TooltipPayload[]
	label?: string
}

function UpcomingContests() {
    const [contests, setContests] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch("/api/contests")
            .then(res => res.json())
            .then(data => {
                if(data.status === "OK") setContests(data.result)
            })
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [])

    if (loading || contests.length === 0) return null;

    const getRelativeTime = (secondsInFuture: number) => {
        const ms = secondsInFuture * 1000 - Date.now();
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));
        if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`;
        const hours = Math.floor(ms / (1000 * 60 * 60));
        return `in ${hours} hr${hours > 1 ? 's' : ''}`;
    }

    return (
        <div className="bg-white dark:bg-[#111] p-4 rounded-[16px] shadow-xl border border-gray-200 dark:border-white/[0.08] backdrop-blur-3xl mt-5 flex-shrink-0">
            <h2 className="text-[17px] font-medium tracking-tight text-gray-900 dark:text-[rgba(255,255,255,0.95)] mb-3 flex items-center">
                <span className="mr-2">🏆</span> Upcoming Contests
            </h2>
            <div className="space-y-2">
                {contests.map((c) => (
                    <div key={c.id} className="flex flex-col p-3 bg-gray-50/50 dark:bg-white/[0.02] border border-transparent dark:border-white/[0.04] rounded-[10px] group hover:dark:bg-white/[0.04] transition-colors">
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-[13px] font-medium text-gray-900 dark:text-[rgba(255,255,255,0.9)] line-clamp-1 pr-2 leading-tight">{c.name}</span>
                            <a href={`https://codeforces.com/contest/${c.id}`} target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold bg-[#1F8ACB]/10 text-[#1F8ACB] hover:bg-[#1F8ACB]/20 px-2 py-0.5 rounded-[4px] tracking-wide flex-shrink-0 flex items-center opacity-0 group-hover:opacity-100 transition-all uppercase">
                                Join <span className="ml-1">→</span>
                            </a>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                            <span className="text-[13px] font-medium text-gray-500 dark:text-[rgba(255,255,255,0.5)]">
                                {getRelativeTime(c.startTimeSeconds)}
                            </span>
                            <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#1F8ACB] shadow-[0_0_8px_rgba(31,138,203,0.6)]" title="Codeforces" />
                                <span className="text-[9px] uppercase font-semibold text-[#1F8ACB]">CF</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function DashboardCharts({ data, progress }: { data: DashboardData; progress: ProgressData }) {
	const ACTIVITY_ITEMS_PER_PAGE = 8
	const [activityPage, setActivityPage] = useState(1)
	const [expandedDay, setExpandedDay] = useState<string | null>(null)
    const router = useRouter()
    const searchParams = useSearchParams()
    const currentPlatform = searchParams.get("platform") || "All"

	const processedActivity = useMemo(() => {
		if (!data.heatmap) return []
		const todayStr = new Date().toISOString().split("T")[0]
		const todayTime = new Date(todayStr + "T00:00:00").getTime()

		return data.heatmap
			.filter((day) => day.count > 0)
			.map((activity) => {
				const activityTime = new Date(activity.date + "T00:00:00").getTime()
				const diffDays = Math.floor((todayTime - activityTime) / (1000 * 60 * 60 * 24))
				const daysAgoText = diffDays === 0 ? "Today" : `${diffDays} days ago`
				return { ...activity, daysAgoText, timestamp: activityTime }
			})
			.sort((a, b) => b.timestamp - a.timestamp)
	}, [data.heatmap])

	const totalActivityPages = Math.max(1, Math.ceil(processedActivity.length / ACTIVITY_ITEMS_PER_PAGE))
	const currentActivityWindow = processedActivity.slice(
		(activityPage - 1) * ACTIVITY_ITEMS_PER_PAGE,
		activityPage * ACTIVITY_ITEMS_PER_PAGE
	)

	const STATUS_COLORS: { [key: string]: string } = {
		Solved: "#10b981",
		Attempted: "#fbbf24",
		Todo: "#ef4444",
		"In Progress": "#3b82f6",
		Review: "#8b5cf6",
	}

	const DIFFICULTY_COLORS: { [key: string]: string } = {
		Easy: "#34d399",
		Medium: "#818cf8",
		Hard: "#c084fc",
	}

	const getStatusColor = (name: string, index: number) => {
		return (
			STATUS_COLORS[name] ||
			Object.values(STATUS_COLORS)[
				index % Object.values(STATUS_COLORS).length
			]
		)
	}

	const getDifficultyColor = (name: string) => {
		return DIFFICULTY_COLORS[name] || "#3b82f6"
	}

	const getDayPlatformDotColor = (problems?: { id: string; name: string; difficulty: string; platform?: string | null }[]) => {
		if (!problems || problems.length === 0) return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)] group-hover:shadow-[0_0_12px_rgba(16,185,129,0.7)]"
		const platforms = new Set(problems.map(p => p.platform))
		if (platforms.size === 1) {
			if (platforms.has('leetcode')) return "bg-[#FFA116] shadow-[0_0_8px_rgba(255,161,22,0.4)] group-hover:shadow-[0_0_12px_rgba(255,161,22,0.7)]"
			if (platforms.has('codeforces')) return "bg-[#1F8ACB] shadow-[0_0_8px_rgba(31,138,203,0.4)] group-hover:shadow-[0_0_12px_rgba(31,138,203,0.7)]"
		}
		return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)] group-hover:shadow-[0_0_12px_rgba(16,185,129,0.7)]"
	}

	const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
		if (active && payload && payload.length) {
			const tooltipData = payload[0].payload
			if (tooltipData.solved !== undefined) {
				return (
					<div className="bg-white dark:bg-[#111] p-4 border border-gray-200 dark:border-white/[0.08] rounded-[10px] shadow-2xl backdrop-blur-3xl">
						<p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
							{label}
						</p>
						<p className="text-sm" style={{ color: "#818cf8" }}>
							Solved:{" "}
							<span className="font-bold">{tooltipData.solved}</span>
						</p>
						<p className="text-sm" style={{ color: "#94a3b8" }}>
							Attempted:{" "}
							<span className="font-bold">{tooltipData.attempted}</span>
						</p>
					</div>
				)
			}
			return (
				<div className="bg-white dark:bg-[#111] p-4 border border-gray-200 dark:border-white/[0.08] rounded-[10px] shadow-2xl backdrop-blur-3xl">
					<p className="text-sm font-medium text-gray-900 dark:text-gray-100">
						{label || payload[0].name}:{" "}
						<span className="font-bold text-gray-900 dark:text-white">
							{payload[0].value}
						</span>
					</p>
				</div>
			)
		}
		return null
	}

	const formatDate = (date: Date) => {
		return date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		})
	}

	const getDateDaysAgo = (days: number) => {
		const date = new Date()
		date.setDate(date.getDate() - days)
		return date
	}

	const generateHeatmapGrid = () => {
		const endDate = new Date()
		const days = 91
		const startDate = getDateDaysAgo(days - 1)
		const dayArray = []
		for (
			let d = new Date(startDate);
			d <= endDate;
			d.setDate(d.getDate() + 1)
		) {
			const dateStr = d.toISOString().split("T")[0]
			const heatmapData = data.heatmap.find(
				(item) => item.date === dateStr
			)
			dayArray.push({
				date: new Date(d),
				count: heatmapData?.count || 0,
			})
		}
		return dayArray
	}

	const getHeatmapColor = (count: number) => {
		if (count === 0) return "rgba(255,255,255,0.02)"
		if (count <= 1) return "#0e4429"
		if (count <= 3) return "#006d32"
		if (count <= 6) return "#26a641"
		return "#39d353"
	}

	const generateTrendData = () => {
		if (!data.heatmap || data.heatmap.length === 0) return []
		const trendMap = new Map<string, number>()
		data.heatmap.forEach((item) => trendMap.set(item.date, item.count))
		const trendResult = []
		for (let i = 29; i >= 0; i--) {
			const date = getDateDaysAgo(i)
			const dateStr = date.toISOString().split("T")[0]
			const count = trendMap.get(dateStr) || 0
			trendResult.push({
				date: date.toLocaleDateString("en-US", {
					month: "short",
					day: "numeric",
				}),
				solved: count,
				attempted: Math.ceil(count * 0.3),
			})
		}
		return trendResult
	}

	const trendData = generateTrendData()

	const handlePlatformChange = (platform: string) => {
		const params = new URLSearchParams(searchParams.toString())
		params.set("platform", platform)
		router.push(`?${params.toString()}`)
	}

	return (
		<div className="flex flex-col space-y-4">
			{/* Global Platform Toggles */}
			<div className="flex justify-start">
				<div className="inline-flex bg-white/50 dark:bg-[#111]/50 backdrop-blur-md border border-gray-200 dark:border-white/[0.08] rounded-[10px] p-1 shadow-sm">
					{['All', 'LeetCode', 'Codeforces'].map((plat) => (
						<button
							key={plat}
							onClick={() => handlePlatformChange(plat)}
							className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-[6px] transition-all duration-200 ${
								currentPlatform === plat
									? "bg-white dark:bg-white/[0.08] shadow-sm text-gray-900 dark:text-white"
									: "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
							}`}
						>
							{plat === 'All' ? 'All Platforms' : plat}
						</button>
					))}
				</div>
			</div>

			<div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
				<div className="xl:col-span-3 space-y-4">
				{/* FSRS Progress UI Module */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
				<div className="bg-white dark:bg-[#111] p-4 rounded-[14px] shadow-xl border border-gray-200 dark:border-white/[0.08] font-sans tracking-tight">
					<h3 className="text-[13px] uppercase font-semibold tracking-wider text-gray-500 dark:text-gray-400 mb-2 flex items-center">
						<span className="mr-2">📚</span> Due Today
					</h3>
					<div className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-baseline gap-2">
                        {progress.dueToday}
                        <span className="text-xs font-normal text-gray-500">
                            / {progress.limit} limit
                        </span>
                    </div>
				</div>

				<div className="bg-white dark:bg-[#111] p-4 rounded-[14px] shadow-xl border border-gray-200 dark:border-white/[0.08] font-sans tracking-tight">
					<h3 className="text-[13px] uppercase font-semibold tracking-wider text-gray-500 dark:text-gray-400 mb-2 flex items-center">
						<span className="mr-2">⚡</span> Reviewed Today
					</h3>
					<div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {progress.reviewedToday}
                    </div>
				</div>

				<div className="bg-white dark:bg-[#111] p-4 rounded-[14px] shadow-xl border border-gray-200 dark:border-white/[0.08] font-sans tracking-tight">
					<h3 className="text-[13px] uppercase font-semibold tracking-wider text-gray-500 dark:text-gray-400 mb-2 flex items-center">
						<span className="mr-2">⏳</span> FSRS Backlog
					</h3>
					<div className={`text-2xl font-bold ${progress.backlog > 0 ? "text-orange-500" : "text-gray-900 dark:text-gray-100"}`}>
                        +{progress.backlog}
                    </div>
					{progress.backlog > 0 && (
                        <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5">
                            ~{progress.daysToClear} day{progress.daysToClear === 1 ? '' : 's'} to clear
                        </p>
                    )}
				</div>
			</div>

			<div className="flex flex-col gap-5">
                {/* Full Width Trend Chart */}
				<div className="w-full h-[280px] flex flex-col bg-white dark:bg-[#111] p-4 pt-5 shadow-xl rounded-[16px] border border-gray-200 dark:border-white/[0.08]">
					<div className="flex-1 min-h-0">
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart
								data={trendData}
								margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
							>
								<defs>
									<linearGradient id="colorSolved" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
										<stop offset="95%" stopColor="#818cf8" stopOpacity={0.0} />
									</linearGradient>
									<linearGradient id="colorAttempted" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#cbd5e1" stopOpacity={0.4} />
										<stop offset="95%" stopColor="#cbd5e1" stopOpacity={0.0} />
									</linearGradient>
								</defs>
								<XAxis
									dataKey="date"
									tick={{ fill: "#64748b", fontSize: 12 }}
									axisLine={{ stroke: "#e2e8f0" }}
                                    tickLine={false}
								/>
								<YAxis
									tick={{ fill: "#64748b", fontSize: 12 }}
									axisLine={{ stroke: "#e2e8f0" }}
                                    tickLine={false}
                                    label={{ value: 'Problems', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 13, fontWeight: 500 } }}
								/>
								<Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} />
								<Area
									type="monotone"
									dataKey="solved"
									name="Solved"
									stroke="#818cf8"
									fill="url(#colorSolved)"
									strokeWidth={2}
								/>
								<Area
									type="monotone"
									dataKey="attempted"
									name="Attempted"
									stroke="#94a3b8"
									fill="url(#colorAttempted)"
									strokeWidth={2}
								/>
								<Legend wrapperStyle={{ paddingTop: "20px" }} />
							</AreaChart>
						</ResponsiveContainer>
					</div>
				</div>

				{/* Conditionally Render Difficulty Chart if not strict Codeforces mode */}
				{currentPlatform !== 'Codeforces' && (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-5 h-[300px]">
					<div className="flex flex-col bg-white dark:bg-[#111] p-4 pt-5 shadow-xl rounded-[16px] border border-gray-200 dark:border-white/[0.08]">
                        <div className="flex justify-between items-center mb-1">
                            <h3 className="text-[14px] font-medium tracking-tight text-gray-900 dark:text-[rgba(255,255,255,0.95)] flex items-center">
                                <span className="mr-2">📊</span> {currentPlatform === 'Codeforces' ? 'Rating Distribution' : 'Problem Difficulty'}
                            </h3>
                        </div>
						<div className="flex-1 min-h-0">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart
									data={data.difficulty}
									margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
								>
									<XAxis
										dataKey="name"
										tick={{ fill: "#64748b", fontSize: 12 }}
										axisLine={{ stroke: "#e2e8f0" }}
                                        tickLine={false}
									/>
									<YAxis
										tick={{ fill: "#64748b", fontSize: 12 }}
										axisLine={{ stroke: "#e2e8f0" }}
                                        tickLine={false}
									/>
									<Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} />
									<Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
										{data.difficulty.map((entry, index) => (
											<Cell
												key={`cell-${index}`}
												fill={getDifficultyColor(entry.name)}
											/>
										))}
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						</div>
					</div>

					<div className="flex flex-col items-center justify-center bg-white dark:bg-[#111] p-4 shadow-xl rounded-[16px] border border-gray-200 dark:border-white/[0.08]">
						<div className="overflow-x-auto w-full flex justify-center flex-1 items-center">
							<div className="grid grid-rows-7 grid-flow-col gap-[3px]">
								{generateHeatmapGrid().map((day, index) => (
									<div
										key={index}
										className="w-3.5 h-3.5 rounded-[2px] cursor-pointer border border-transparent dark:border-white/[0.04]"
										style={{ backgroundColor: getHeatmapColor(day.count) }}
										title={`${formatDate(day.date)} - ${day.count} problems solved`}
									/>
								))}
							</div>
						</div>
						<div className="flex items-center justify-center gap-x-3 mt-6 text-sm text-gray-500 dark:text-[#888]">
							<span className="font-medium text-[13px] uppercase tracking-wider">Less</span>
							<div className="flex items-center space-x-1.5">
								{[0, 1, 3, 6, 10].map((count, i) => (
									<div
										key={i}
										className="w-3.5 h-3.5 rounded-[2px] border border-transparent dark:border-white/[0.04] shadow-sm"
										style={{ backgroundColor: getHeatmapColor(count) }}
									/>
								))}
							</div>
							<span className="font-medium text-[13px] uppercase tracking-wider">More</span>
						</div>
					</div>
				</div>
                )}

				{/* Full Width Elo Histogram (Dynamic based on data) */}
                {data.eloDistribution && data.eloDistribution.length > 0 && (
				<div className="w-full h-[240px] flex flex-col bg-white dark:bg-[#111] p-4 pt-5 shadow-xl rounded-[16px] border border-gray-200 dark:border-white/[0.08]">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-[15px] font-medium tracking-tight text-gray-900 dark:text-[rgba(255,255,255,0.95)] flex items-center">
                            <span className="mr-2">📈</span> Elo Rating Distribution
                        </h3>
                    </div>
					<div className="flex-1 min-h-0">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart
								data={data.eloDistribution}
								margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
							>
								<XAxis
									dataKey="name"
									tick={{ fill: "#64748b", fontSize: 12 }}
									axisLine={{ stroke: "#e2e8f0" }}
                                    tickLine={false}
								/>
								<YAxis
									tick={{ fill: "#64748b", fontSize: 12 }}
									axisLine={{ stroke: "#e2e8f0" }}
                                    tickLine={false}
								/>
								<Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} />
								<Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60} fill="#1F8ACB">
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
                )}
			</div>
            </div>

			{processedActivity.length > 0 && (
                <div className="xl:col-span-1 relative">
                <div className="sticky top-24 flex flex-col h-[calc(100vh-120px)]">
				<div className="bg-white dark:bg-[#111] p-4 rounded-[16px] shadow-xl border border-gray-200 dark:border-white/[0.08] relative overflow-hidden backdrop-blur-3xl flex-1 flex flex-col min-h-0">
					<div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent mix-blend-overlay pointer-events-none" />
					<div className="flex items-center justify-between mb-4 flex-shrink-0">
						<h2 className="text-[15px] font-medium tracking-tight text-gray-900 dark:text-[rgba(255,255,255,0.95)] flex items-center">
							<span className="mr-2">⚡</span>
							Recent Activity
						</h2>
						<div className="flex items-center gap-2">
							<span className="text-[12px] font-medium text-gray-400 dark:text-[#666] mr-3">
								{activityPage} <span className="opacity-50">/</span> {totalActivityPages}
							</span>
							<button 
								onClick={() => setActivityPage(p => Math.max(1, p - 1))}
								disabled={activityPage === 1}
								className="w-7 h-7 rounded-md bg-gray-100 dark:bg-white/[0.04] border border-transparent dark:border-white/[0.04] flex items-center justify-center text-gray-600 dark:text-[#888] hover:dark:bg-white/[0.08] hover:dark:text-[rgba(255,255,255,0.9)] disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
							>
								<ChevronLeft className="w-4 h-4" />
							</button>
							<button 
								onClick={() => setActivityPage(p => Math.min(totalActivityPages, p + 1))}
								disabled={activityPage === totalActivityPages}
								className="w-7 h-7 rounded-md bg-gray-100 dark:bg-white/[0.04] border border-transparent dark:border-white/[0.04] flex items-center justify-center text-gray-600 dark:text-[#888] hover:dark:bg-white/[0.08] hover:dark:text-[rgba(255,255,255,0.9)] disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
							>
								<ChevronRight className="w-4 h-4" />
							</button>
						</div>
					</div>
					<div className="space-y-2 overflow-y-auto flex-1 pr-2 mt-2 custom-scrollbar">
						{currentActivityWindow.map((activity, index) => (
                            <div key={`${activity.date}-${index}`} className="flex flex-col gap-2">
							<div
                                onClick={() => setExpandedDay(expandedDay === activity.date ? null : activity.date)}
								className="flex items-center justify-between p-3.5 bg-gray-50/50 dark:bg-white/[0.02] border border-transparent dark:border-white/[0.04] rounded-[10px] cursor-pointer group hover:dark:bg-white/[0.04] hover:dark:border-white/[0.08] transition-colors"
							>
								<div className="flex items-center space-x-3.5">
									<div className={`w-1.5 h-1.5 rounded-full transition-all ${getDayPlatformDotColor(activity.problems)}`}></div>
									<div>
										<p className="font-medium text-[14px] text-gray-900 dark:text-[rgba(255,255,255,0.9)] tracking-wide group-hover:text-white transition-colors">
											{activity.count} problem
											{activity.count > 1 ? "s" : ""}{" "}
											solved
										</p>
										<p className="text-[13px] mt-0.5 text-gray-500 dark:text-[#888]">
											{new Date(activity.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
										</p>
									</div>
								</div>
								<span className="text-[13px] font-medium text-gray-600 dark:text-[rgba(255,255,255,0.5)]">
									{activity.daysAgoText}
								</span>
							</div>
                            {expandedDay === activity.date && activity.problems && activity.problems.length > 0 && (
                                <div className="ml-3 pl-3 border-l-[1.5px] border-gray-200 dark:border-white/[0.06] flex flex-col gap-2 pb-2 mt-1">
                                    {activity.problems.map((p) => (
                                        <div key={p.id} className="text-[13px] flex items-center justify-between text-gray-700 dark:text-[rgba(255,255,255,0.7)] hover:dark:text-white transition-colors py-1">
                                            <div className="flex items-center gap-2 pr-3 w-[150px]">
                                                {p.platform === 'leetcode' && <div className="w-1.5 h-1.5 rounded-full bg-[#FFA116] shadow-[0_0_8px_rgba(255,161,22,0.4)]" title="LeetCode" />}
                                                {p.platform === 'codeforces' && <div className="w-1.5 h-1.5 rounded-full bg-[#1F8ACB] shadow-[0_0_8px_rgba(31,138,203,0.4)]" title="Codeforces" />}
                                                {!p.platform && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" title="Manual" />}
                                                <span className="truncate">{p.name}</span>
                                            </div>
                                            <span className={`text-[11px] px-2 py-0.5 rounded-[4px] font-bold uppercase tracking-wider flex-shrink-0 ${
                                                p.platform === 'Codeforces' || p.platform === 'codeforces' ? 'bg-[#1F8ACB]/10 text-[#1F8ACB]' :
                                                p.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-500' :
                                                p.difficulty === 'Medium' ? 'bg-indigo-500/10 text-indigo-400' :
                                                'bg-purple-500/10 text-purple-400'
                                            }`}>
                                                {p.platformRating ? `Rating ${p.platformRating}` : p.difficulty}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            </div>
						))}
					</div>
				</div>
                <UpcomingContests />
                </div>
                </div>
			)}
        </div>
		</div>
	)
}
