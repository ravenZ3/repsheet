"use client"

import {
	PieChart,
	Pie,
	Cell,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	Legend,
	AreaChart,
	Area,
} from "recharts"
import { useEffect, useState } from "react"
import {
	ResizablePanelGroup,
	ResizablePanel,
	ResizableHandle,
} from "@/components/ui/resizable"

// --- Define specific types for our data ---
type ChartData = { name: string; value: number }[]
type HeatmapData = { date: string; count: number }[]
type DashboardData = {
	status: ChartData
	difficulty: ChartData
	heatmap: HeatmapData
}

// --- Type for the Tooltip props ---
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

export default function Dashboard() {
	const [data, setData] = useState<DashboardData>({
		status: [],
		difficulty: [],
		heatmap: [],
	})
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoading(true)
				const res = await fetch("/api/dashboard")
				if (!res.ok) throw new Error("Failed to fetch dashboard data")
				const dashboardData = await res.json()
				setData(dashboardData)
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "An error occurred"
				)
			} finally {
				setLoading(false)
			}
		}

		fetchData()
	}, [])

	const STATUS_COLORS: { [key: string]: string } = {
		Solved: "#10b981",
		Attempted: "#fbbf24",
		Todo: "#ef4444",
		"In Progress": "#3b82f6",
		Review: "#8b5cf6",
	}

	const DIFFICULTY_COLORS: { [key: string]: string } = {
		Easy: "#10b981",
		Medium: "#fbbf24",
		Hard: "#ef4444",
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

	const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
		if (active && payload && payload.length) {
			const data = payload[0].payload
			if (data.solved !== undefined) {
				return (
					<div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl backdrop-blur-sm">
						<p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
							{label}
						</p>
						<p className="text-sm" style={{ color: "#10b981" }}>
							Solved:{" "}
							<span className="font-bold">{data.solved}</span>
						</p>
						<p className="text-sm" style={{ color: "#3b82f6" }}>
							Attempted:{" "}
							<span className="font-bold">{data.attempted}</span>
						</p>
					</div>
				)
			}
			return (
				<div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl backdrop-blur-sm">
					<p className="text-sm font-medium text-gray-900 dark:text-gray-100">
						{label || payload[0].name}:{" "}
						<span className="font-bold text-blue-600">
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
		if (count === 0) return "hsl(var(--muted))"
		if (count <= 1) return "#9be9a8"
		if (count <= 3) return "#40c463"
		if (count <= 6) return "#30a14e"
		return "#216e39"
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

	if (loading) {
		return (
			<div className="max-w-7xl mx-auto mt-10 px-4">
				<div className="animate-pulse">
					<div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6"></div>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						<div className="bg-gray-200 dark:bg-gray-700 h-80 rounded-xl"></div>
						<div className="bg-gray-200 dark:bg-gray-700 h-80 rounded-xl"></div>
						<div className="bg-gray-200 dark:bg-gray-700 h-80 rounded-xl"></div>
					</div>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="max-w-7xl mx-auto mt-10 px-4">
				<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
					<div className="flex items-center">
						<div className="text-red-400 mr-2">⚠️</div>
						<h3 className="text-red-800 dark:text-red-200 font-medium">
							Error loading dashboard
						</h3>
					</div>
					<p className="text-red-700 dark:text-red-300 mt-1">
						{error}
					</p>
				</div>
			</div>
		)
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

			<ResizablePanelGroup
				direction="horizontal"
				className="w-full min-h-[800px] rounded-lg border dark:border-gray-700"
			>
				<ResizablePanel defaultSize={50}>
					<ResizablePanelGroup direction="vertical">
						<ResizablePanel defaultSize={50}>
							<div className="flex h-full w-full flex-col bg-white dark:bg-gray-800 p-6 shadow-lg hover:shadow-xl transition-shadow">
								<h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
									<span className="mr-2">🧩</span>
									Status Breakdown
								</h2>
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={data.status}
											dataKey="value"
											nameKey="name"
											cx="50%"
											cy="50%"
											outerRadius="80%"
											label={({ name, percent }) =>
												`${name}: ${
													percent
														? (
																percent * 100
														  ).toFixed(0)
														: 0
												}%`
											}
											labelLine={false}
										>
											{data.status.map((entry, index) => (
												<Cell
													key={`cell-${index}`}
													fill={getStatusColor(
														entry.name,
														index
													)}
												/>
											))}
										</Pie>
										<Tooltip content={<CustomTooltip />} />
										<Legend />
									</PieChart>
								</ResponsiveContainer>
							</div>
						</ResizablePanel>
						<ResizableHandle withHandle />
						<ResizablePanel defaultSize={50}>
							<div className="flex h-full w-full flex-col bg-white dark:bg-gray-800 p-6 shadow-lg hover:shadow-xl transition-shadow">
								<h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
									<span className="mr-2">🎯</span>
									Difficulty Distribution
								</h2>
								<ResponsiveContainer width="100%" height="100%">
									<BarChart
										data={data.difficulty}
										margin={{
											top: 20,
											right: 30,
											left: 0,
											bottom: 5,
										}}
									>
										<XAxis
											dataKey="name"
											tick={{ fill: "currentColor" }}
											axisLine={{
												stroke: "currentColor",
											}}
										/>
										<YAxis
											tick={{ fill: "currentColor" }}
											axisLine={{
												stroke: "currentColor",
											}}
										/>
										<Tooltip content={<CustomTooltip />} />
										<Bar
											dataKey="value"
											radius={[8, 8, 0, 0]}
										>
											{data.difficulty.map(
												(entry, index) => (
													<Cell
														key={`cell-${index}`}
														fill={getDifficultyColor(
															entry.name
														)}
													/>
												)
											)}
										</Bar>
									</BarChart>
								</ResponsiveContainer>
							</div>
						</ResizablePanel>
					</ResizablePanelGroup>
				</ResizablePanel>
				<ResizableHandle withHandle />
				<ResizablePanel defaultSize={50}>
					<ResizablePanelGroup direction="vertical">
						<ResizablePanel defaultSize={50}>
							<div className="flex h-full w-full flex-col bg-white dark:bg-gray-800 p-6 shadow-lg hover:shadow-xl transition-shadow">
								<h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
									<span className="mr-2">📊</span>
									30-Day Progress Trend
								</h2>
								<ResponsiveContainer width="100%" height="100%">
									<AreaChart
										data={trendData}
										margin={{
											top: 5,
											right: 20,
											left: 0,
											bottom: 5,
										}}
									>
										<defs>
											<linearGradient
												id="colorSolved"
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
												<stop
													offset="5%"
													stopColor="#10b981"
													stopOpacity={0.8}
												/>
												<stop
													offset="95%"
													stopColor="#10b981"
													stopOpacity={0.1}
												/>
											</linearGradient>
											<linearGradient
												id="colorAttempted"
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
												<stop
													offset="5%"
													stopColor="#3b82f6"
													stopOpacity={0.8}
												/>
												<stop
													offset="95%"
													stopColor="#3b82f6"
													stopOpacity={0.1}
												/>
											</linearGradient>
										</defs>
										<XAxis
											dataKey="date"
											tick={{
												fill: "currentColor",
												fontSize: 12,
											}}
											axisLine={{
												stroke: "currentColor",
											}}
										/>
										<YAxis
											tick={{ fill: "currentColor" }}
											axisLine={{
												stroke: "currentColor",
											}}
										/>
										<Tooltip content={<CustomTooltip />} />
										<Area
											type="monotone"
											dataKey="solved"
											name="Solved"
											stroke="#10b981"
											fill="url(#colorSolved)"
											strokeWidth={2}
										/>
										<Area
											type="monotone"
											dataKey="attempted"
											name="Attempted"
											stroke="#3b82f6"
											fill="url(#colorAttempted)"
											strokeWidth={2}
										/>
										<Legend />
									</AreaChart>
								</ResponsiveContainer>
							</div>
						</ResizablePanel>
						<ResizableHandle withHandle />
						<ResizablePanel defaultSize={50}>
							<div className="flex h-full w-full flex-col items-center justify-center bg-white dark:bg-gray-800 p-6 shadow-lg hover:shadow-xl transition-shadow">
								<h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white flex items-center">
									<span className="mr-2">📅</span>
									Daily Activity Heatmap
								</h2>
								<div className="overflow-x-auto w-full flex justify-center">
									<div className="grid grid-rows-7 grid-flow-col gap-1">
										{generateHeatmapGrid().map(
											(day, index) => (
												<div
													key={index}
													className="w-4 h-4 rounded-sm hover:ring-2 hover:ring-blue-400 hover:ring-offset-1 hover:scale-125 cursor-pointer transition-all duration-200 ease-in-out border border-gray-300/40 dark:border-gray-600/40 shadow-sm"
													style={{
														backgroundColor:
															getHeatmapColor(
																day.count
															),
													}}
													title={`${formatDate(
														day.date
													)} - ${
														day.count
													} problems solved`}
												/>
											)
										)}
									</div>
								</div>
								<div className="flex items-center justify-center gap-x-2 mt-6 text-sm text-gray-600 dark:text-gray-400">
									<span className="font-medium">Less</span>
									<div className="flex items-center space-x-1">
										{[0, 1, 3, 6, 10].map((count, i) => (
											<div
												key={i}
												className="w-3 h-3 rounded-sm border border-gray-300/40 dark:border-gray-600/40 shadow-sm"
												style={{
													backgroundColor:
														getHeatmapColor(count),
												}}
											/>
										))}
									</div>
									<span className="font-medium">More</span>
								</div>
							</div>
						</ResizablePanel>
					</ResizablePanelGroup>
				</ResizablePanel>
			</ResizablePanelGroup>
			{data.heatmap && data.heatmap.length > 0 && (
				<div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
					<h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
						<span className="mr-2">⚡</span>
						Recent Activity
					</h2>
					<div className="space-y-3">
						{data.heatmap
							.filter((day) => day.count > 0)
							.sort(
								(a, b) =>
									new Date(b.date).getTime() -
									new Date(a.date).getTime()
							)
							.slice(0, 5)
							.map((activity, index) => (
								<div
									key={index}
									className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
								>
									<div className="flex items-center space-x-3">
										<div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
										<div>
											<p className="font-medium text-gray-900 dark:text-white">
												{activity.count} problem
												{activity.count > 1
													? "s"
													: ""}{" "}
												solved
											</p>
											<p className="text-sm text-gray-500 dark:text-gray-400">
												{new Date(
													activity.date + "T00:00:00"
												).toLocaleDateString("en-US", {
													weekday: "long",
													month: "long",
													day: "numeric",
												})}
											</p>
										</div>
									</div>
									<span className="text-sm font-medium text-gray-600 dark:text-gray-300">
										{Math.floor(
											(new Date().getTime() -
												new Date(
													activity.date + "T00:00:00"
												).getTime()) /
												(1000 * 60 * 60 * 24)
										) === 0
											? "Today"
											: `${Math.floor(
													(new Date().getTime() -
														new Date(
															activity.date +
																"T00:00:00"
														).getTime()) /
														(1000 * 60 * 60 * 24)
											  )} days ago`}
									</span>
								</div>
							))}
					</div>
				</div>
			)}
		</div>
	)
}
