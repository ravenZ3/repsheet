import { PrismaClient } from "@prisma/client"
import { NextResponse } from "next/server"

const prisma = new PrismaClient()

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
	const data = await req.json()
	const updated = await prisma.problem.update({
		where: { id: params.id },
		data,
	})
	return NextResponse.json(updated)
}
