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
} from "recharts"
import { useEffect, useState } from "react"

type ChartData = { name: string; value: number }[]
type DashboardData = {
	status: ChartData
	difficulty: ChartData
	heatmap: { date: string; count: number }[]
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
				const d = await res.json()
				setData(d)
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

	const STATUS_COLORS = {
		Solved: "#10b981",
		Attempted: "#fbbf24",
		Todo: "#ef4444",
		"In Progress": "#3b82f6",
		Review: "#8b5cf6",
	}

	const DIFFICULTY_COLORS = {
		Easy: "#10b981",
		Medium: "#fbbf24",
		Hard: "#ef4444",
	}

	const getStatusColor = (name: string, index: number) => {
		return (
			STATUS_COLORS[name as keyof typeof STATUS_COLORS] ||
			Object.values(STATUS_COLORS)[
				index % Object.values(STATUS_COLORS).length
			]
		)
	}

	const getDifficultyColor = (name: string) => {
		return (
			DIFFICULTY_COLORS[name as keyof typeof DIFFICULTY_COLORS] ||
			"#3b82f6"
		)
	}

	const CustomTooltip = ({ active, payload, label }: any) => {
		if (active && payload && payload.length) {
			return (
				<div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
					<p className="text-sm font-medium text-gray-900 dark:text-gray-100">
						{label}: {payload[0].value}
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
		const startDate = getDateDaysAgo(365)
		const endDate = new Date()
		const days = []

		for (
			let d = new Date(startDate);
			d <= endDate;
			d.setDate(d.getDate() + 1)
		) {
			const dateStr = d.toISOString().split("T")[0]
			const heatmapData = data.heatmap.find(
				(item) => item.date === dateStr
			)
			days.push({
				date: new Date(d),
				count: heatmapData?.count || 0,
			})
		}

		return days
	}

	const getHeatmapColor = (count: number) => {
		if (count === 0) return "#ebedf0"
		if (count === 1) return "#9be9a8"
		if (count <= 3) return "#40c463"
		if (count <= 6) return "#30a14e"
		return "#216e39"
	}

	const totalProblems = data.status.reduce((sum, item) => sum + item.value, 0)
	const totalSolved =
		data.status.find((item) => item.name === "Solved")?.value || 0
	const solveRate =
		totalProblems > 0
			? ((totalSolved / totalProblems) * 100).toFixed(1)
			: "0"

	if (loading) {
		return (
			<div className="max-w-6xl mx-auto mt-10 px-4">
				<div className="animate-pulse">
					<div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6"></div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
						<div className="bg-gray-200 dark:bg-gray-700 h-80 rounded-xl"></div>
						<div className="bg-gray-200 dark:bg-gray-700 h-80 rounded-xl"></div>
					</div>
					<div className="mt-8 bg-gray-200 dark:bg-gray-700 h-64 rounded-xl"></div>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="max-w-6xl mx-auto mt-10 px-4">
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
		<div className="max-w-6xl mx-auto mt-10 px-4 space-y-8">
			{/* Header */}
			<div className="text-center">
				<h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
					Repsheet Dasboard
				</h1>
				<p className="text-gray-600 dark:text-gray-400">
					Track your coding progress and performance metrics
				</p>
			</div>

		
			{/* Charts */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Status Chart */}
				<div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
					<h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
						<span className="mr-2">🧩</span>
						Status Breakdown
					</h2>
					<ResponsiveContainer width="100%" height={300}>
						<PieChart>
							<Pie
								data={data.status}
								dataKey="value"
								nameKey="name"
								cx="50%"
								cy="50%"
								outerRadius={80}
								label={({ name, value, percent }) =>
									`${name}: ${(percent * 100).toFixed(0)}%`
								}
								labelLine={false}
							>
								{data.status.map((entry, index) => (
									<Cell
										key={`cell-${index}`}
										fill={getStatusColor(entry.name, index)}
									/>
								))}
							</Pie>
							<Tooltip content={<CustomTooltip />} />
							<Legend />
						</PieChart>
					</ResponsiveContainer>
				</div>

				{/* Difficulty Chart */}
				<div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
					<h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
						<span className="mr-2">🎯</span>
						Difficulty Distribution
					</h2>
					<ResponsiveContainer width="100%" height={300}>
						<BarChart
							data={data.difficulty}
							margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
						>
							<XAxis
								dataKey="name"
								tick={{ fill: "currentColor" }}
								axisLine={{ stroke: "currentColor" }}
							/>
							<YAxis
								tick={{ fill: "currentColor" }}
								axisLine={{ stroke: "currentColor" }}
							/>
							<Tooltip content={<CustomTooltip />} />
							<Bar dataKey="value" radius={[4, 4, 0, 0]}>
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

			{/* Custom Heatmap */}
			<div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
				<h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white flex items-center">
					<span className="mr-2">📅</span>
					Daily Activity Heatmap
				</h2>
				<div className="overflow-x-auto">
					<div className="grid grid-cols-30 gap-1 w-5xl">
						{generateHeatmapGrid().map((day, index) => (
							<div
								key={index}
								className="w-3 h-3 rounded-full hover:ring-2 hover:ring-blue-300 cursor-pointer transition-all"
								style={{
									backgroundColor: getHeatmapColor(day.count),
								}}
								title={`${formatDate(day.date)} - ${
									day.count
								} problems solved`}
							/>
						))}
					</div>
				</div>
				<div className="flex items-center justify-between mt-4 text-sm text-gray-600 dark:text-gray-400">
					<span>Less</span>
					<div className="flex items-center space-x-1">
						<div
							className="w-3 h-3 rounded-sm"
							style={{ backgroundColor: "#ebedf0" }}
						></div>
						<div
							className="w-3 h-3 rounded-sm"
							style={{ backgroundColor: "#9be9a8" }}
						></div>
						<div
							className="w-3 h-3 rounded-sm"
							style={{ backgroundColor: "#40c463" }}
						></div>
						<div
							className="w-3 h-3 rounded-sm"
							style={{ backgroundColor: "#30a14e" }}
						></div>
						<div
							className="w-3 h-3 rounded-sm"
							style={{ backgroundColor: "#216e39" }}
						></div>
					</div>
					<span>More</span>
				</div>
			</div>
		</div>
	)
}
