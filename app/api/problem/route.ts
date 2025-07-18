import { PrismaClient, Prisma } from "@prisma/client" // Import Prisma namespace for error types
import { NextRequest, NextResponse } from "next/server"

const prisma = new PrismaClient()

// Define a type for the expected request body for full type safety.
interface ProblemPostBody {
	name: string
	platform: string
	link: string
	// Define difficulty and status based on the expected string values from the client.
	// These must match the enum values in your Prisma schema.
	difficulty: 'Easy' | 'Medium' | 'Hard'
	status: 'To Revise' | 'Stuck' | 'Solved' | 'Revisited'
	category: string | string[]
	dateSolved?: string
}

export async function POST(req: NextRequest) {
	try {
		// Cast the JSON body to our new, safer interface.
		const body: ProblemPostBody = await req.json()

		// Basic validation for required fields
		if (!body.name || !body.platform || !body.difficulty || !body.status || !body.category) {
			return NextResponse.json(
				{ success: false, message: "Missing required fields." },
				{ status: 400 }
			)
		}

		// Ensure category is a string array.
		const categories = Array.isArray(body.category)
			? body.category.map((tag) => tag.trim()).filter(Boolean)
			: String(body.category).split(",").map((tag) => tag.trim()).filter(Boolean)

		if (categories.length === 0) {
			return NextResponse.json(
				{ success: false, message: "Category field cannot be empty." },
				{ status: 400 }
			)
		}
		
		// Validate and process the date, defaulting to now() if not provided.
		const dateSolved = body.dateSolved ? new Date(body.dateSolved) : new Date()
		if (isNaN(dateSolved.getTime())) {
			return NextResponse.json(
				{ success: false, message: "Invalid date format for dateSolved." },
				{ status: 400 }
			)
		}

		// Placeholder: Replace with actual user ID from your authentication logic (e.g., Clerk, NextAuth).
		const userId = '64d1f0f33a1c2b5e5cabc123'

		const problem = await prisma.problem.create({
			data: {
				userId,
				name: body.name,
				platform: body.platform,
				link: body.link,
				difficulty: body.difficulty,
				status: body.status,
				category: { set: categories }, // Use 'set' for string arrays in Prisma
				dateSolved: dateSolved,
				nextReviewDate: dateSolved, // Example: Default next review to the same day
				reviewCount: 0,
			},
		})

		return NextResponse.json({ success: true, problem }, { status: 201 })
	
	// FIX: Changed 'error: any' to 'error: unknown' for type safety.
	} catch (error: unknown) {
		console.error("Error creating problem:", error)

		// FIX: Use type guards to safely handle different kinds of errors.
		// Handle known Prisma request errors (e.g., unique constraint violation).
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === "P2002") {
				const target = (error.meta?.target as string[])?.join(", ") || "fields"
				return NextResponse.json(
					{ success: false, message: `A problem with this ${target} already exists.` },
					{ status: 409 } // Conflict
				)
			}
		}
		
		// Handle standard JavaScript errors.
		if (error instanceof Error) {
			return NextResponse.json(
				{ success: false, message: `Failed to create problem: ${error.message}` },
				{ status: 500 }
			)
		}

		// Fallback for any other unknown errors.
		return NextResponse.json(
			{ success: false, message: "An unexpected error occurred." },
			{ status: 500 }
		)
	}
}