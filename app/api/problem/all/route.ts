import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import prisma from "@/lib/prisma"

export async function GET() {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user?.id) {
			return NextResponse.json(
				{ error: "Not authenticated" },
				{ status: 401 }
			)
		}

		// Fetch all problems for the logged-in user, but limited to a safe max for client-side search caching.
		// Select only what the list/search/detail UI renders — notes/mistakesMade stay
		// because ProblemDetail renders straight from this cache, but internal FSRS
		// parameters (stability, fsrsDifficulty, fsrsState, lastRating) and plumbing
		// ids never reach the client UI.
		const problems = await prisma.problem.findMany({
			where: {
				userId: session.user.id,
			},
			select: {
				id: true,
				name: true,
				platform: true,
				link: true,
				difficulty: true,
				isStuck: true,
				isStarred: true,
				category: true,
				notes: true,
				mistakesMade: true,
				dateSolved: true,
				reviewCount: true,
				nextReviewDate: true,
				lastReview: true,
				platformRating: true,
			},
			orderBy: {
				dateSolved: "desc",
			},
			take: 2000, // Capping at 2000 to prevent extreme browser memory exhaustion long-term
		})

		return NextResponse.json(problems)
	} catch (error) {
		console.error("Error fetching all problems:", error)
		return NextResponse.json(
			{ error: "Failed to fetch problems" },
			{ status: 500 }
		)
	}
}
