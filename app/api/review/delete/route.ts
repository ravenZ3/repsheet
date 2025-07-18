import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'Problem ID is required' }, { status: 400 })
    }

    await prisma.problem.delete({ where: { id } })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    // ADD THIS LINE TO SEE THE FULL ERROR IN VERCEL LOGS
    console.error("[API_DELETE_ERROR]", err);

    const errorMessage = err instanceof Error ? err.message : 'Failed to delete problem'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}