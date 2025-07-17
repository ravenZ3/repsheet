import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'Problem ID is required' }, { status: 400 })
    }

    await prisma.problem.delete({ where: { id } })
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to delete problem'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}