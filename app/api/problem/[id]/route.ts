import { PrismaClient } from "@prisma/client"
import { NextResponse } from "next/server"

const prisma = new PrismaClient()

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
	try {
		const data = await req.json()
		const updated = await prisma.problem.update({
			where: { id: params.id },
			data,
		})
		return NextResponse.json(updated)
	} catch (error) {
		console.error("PATCH /api/problem/[id] error:", error)
		return NextResponse.json({ error: "Failed to update problem" }, { status: 500 })
	} finally {
		await prisma.$disconnect()
	}
}
