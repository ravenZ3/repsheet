import { PrismaClient } from "@prisma/client"
import { format, startOfDay, endOfDay } from "date-fns"

const prisma = new PrismaClient()

export default async function ReviewPage() {
	const today = new Date()

	const [problems, totalCount, reviewedToday] = await Promise.all([
		prisma.problem.findMany({
			where: {
				userId: "64d1f0f33a1c2b5e5cabc123",
				nextReviewDate: { lte: today },
			},
			orderBy: { nextReviewDate: "asc" },
		}),
		prisma.problem.count({
			where: { userId: "64d1f0f33a1c2b5e5cabc123" },
		}),
		prisma.problem.count({
			where: {
				userId: "64d1f0f33a1c2b5e5cabc123",
				nextReviewDate: {
					gte: startOfDay(today),
					lte: endOfDay(today),
				},
			},
		}),
	])

	return (
		<div className="max-w-3xl mx-auto mt-10 px-4">
			<h1 className="text-2xl font-bold mb-6">
				📚 Problems Due for Review
			</h1>

			{problems.length === 0 && (
				<p className="text-gray-500">
					No problems to review today. You're all caught up!
				</p>
			)}

			<div className="mb-6 p-4 rounded-2xl shadow-md backdrop-blur-lg bg-white/40 dark:bg-white/10 text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-700 transition-colors duration-300 hover:scale-[1.02] hover:shadow-lg transition-transform duration-300
">
				<h2 className="text-lg font-semibold mb-2">
					📊 Progress Today
				</h2>
				<p>📝 Problems due: {problems.length}</p>
				<p>✅ Problems reviewed today: {reviewedToday}</p>
				<p>📦 Total problems in your sheet: {totalCount}</p>
			</div>

			<ul className="space-y-4">
				{problems.map((p) => (
					<li
						key={p.id}
						className="border p-4 rounded-lg bg-white shadow"
					>
						<a
							href={p.link}
							target="_blank"
							rel="noopener noreferrer"
							className="text-lg font-semibold text-blue-600"
						>
							{p.name}
						</a>
						<div className="text-sm text-gray-700 mt-1 space-y-1">
							<p>
								📅 Solved:{" "}
								{format(new Date(p.dateSolved), "dd MMM yyyy")}
							</p>
							<p>🎯 Status: {p.status}</p>
							<p>⚡ Difficulty: {p.difficulty}</p>
							<p>🏷️ Category: {p.category.join(", ")}</p>
							<p>🔁 Reviews done: {p.reviewCount}</p>
						</div>

						<div className="mt-3 flex gap-2">
							<form action={`/review/mark`} method="POST">
								<input type="hidden" name="id" value={p.id} />
								<button
									type="submit"
									className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-sm"
								>
									Mark Reviewed
								</button>
							</form>

							<form action={`/review/delete`} method="POST">
								<input type="hidden" name="id" value={p.id} />
								<button
									type="submit"
									className="bg-red-500 text-black px-3 py-1 rounded hover:bg-red-600 text-sm"
								>
									Delete
								</button>
							</form>

							<a
								href={`/edit/${p.id}`}
								className="bg-yellow-400 text-black px-3 py-1 rounded hover:bg-yellow-500 text-sm"
							>
								Edit
							</a>
						</div>
					</li>
				))}
			</ul>
		</div>
	)
}
