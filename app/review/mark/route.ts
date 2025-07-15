import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { addDays } from 'date-fns'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const id = formData.get('id') as string

  const problem = await prisma.problem.findUnique({
    where: { id },
  })

  if (!problem) {
    return NextResponse.json({ error: 'Problem not found' }, { status: 404 })
  }

  const updated = await prisma.problem.update({
    where: { id },
    data: {
      reviewCount: problem.reviewCount + 1,
      nextReviewDate: addDays(new Date(), 3),
    },
  })

  return NextResponse.redirect(new URL('/review', req.url))
}
