import prisma from '@/lib/prisma' // <-- Import the singleton instance
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'Problem ID is required' }, { status: 400 })
    }

    // Now using the shared Prisma instance
    await prisma.problem.delete({ where: { id } })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    // This is good error handling
    const errorMessage = err instanceof Error ? err.message : 'Failed to delete problem'
    console.error("Error deleting problem:", errorMessage); // Log the error for debugging
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}