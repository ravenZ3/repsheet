import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { Problem } from "@prisma/client"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"

export async function GET(
	request: NextRequest,
	context: { params: { id: string } }
) {
	const session = await getServerSession(authOptions)
	if (!session || !session.user?.id) {
		return NextResponse.json(
			{ success: false, error: "Not authenticated" },
			{ status: 401 }
		)
	}

	const { id } = context.params

	const problem = await prisma.problem.findFirst({
		where: {
			id: id,
			userId: session.user.id,
		},
	})

	if (!problem) {
		return NextResponse.json(
			{ success: false, error: "Problem not found" },
			{ status: 404 }
		)
	}

	return NextResponse.json({ success: true, data: problem }, { status: 200 })
}

// This is just the PATCH function. Your GET function can remain as it is.
export async function PATCH(
	request: NextRequest
	// NOTICE: We have removed the second argument: context: { params: { id: string } }
) {
	const session = await getServerSession(authOptions)
	if (!session || !session.user?.id) {
		return NextResponse.json(
			{ error: "Not authenticated" },
			{ status: 401 }
		)
	}

	try {
		const body = await request.json()

		// --- THE DEFINITIVE FIX ---
		// We will get the ID directly from the URL path.
		// e.g., for "/api/problem/abcde", this gets "abcde".
		const id = request.nextUrl.pathname.split("/").pop()
		// --- END OF FIX ---

		if (!id) {
			// This will trigger if the URL is somehow malformed, e.g., "/api/problem/"
			return NextResponse.json(
				{
					success: false,
					message: "Could not determine problem ID from URL.",
				},
				{ status: 400 }
			)
		}

		// The rest of your logic is perfect and remains unchanged.
		const updateData: Partial<Problem> = {}
		if (body.name !== undefined) updateData.name = body.name
		// ...etc for all your fields

		const updateResult = await prisma.problem.updateMany({
			where: {
				id: id, // Use the ID we parsed from the URL
				userId: session.user.id,
			},
			data: updateData,
		})

		if (updateResult.count === 0) {
			return NextResponse.json(
				{
					success: false,
					message: "Problem not found or permission denied",
				},
				{ status: 404 }
			)
		}

		const updatedProblem = await prisma.problem.findUnique({
			where: { id: id },
		})

		return NextResponse.json(updatedProblem, { status: 200 })
	} catch (error) {
		console.error("PATCH Error:", error)
		return NextResponse.json(
			{ success: false, message: "Failed to update problem" },
			{ status: 500 }
		)
	}
}
