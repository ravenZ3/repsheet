import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  const body = await req.json()

  const problem = await prisma.problem.create({
    data: {
      name: body.name,
      platform: body.platform,
      link: body.link,
      difficulty: body.difficulty,
      status: body.status,
      category: body.category.split(',').map((tag: string) => tag.trim()),
      dateSolved: new Date(body.dateSolved),
      nextReviewDate: new Date(body.dateSolved), // for now same day
      reviewCount: 0,
      userId: '64d1f0f33a1c2b5e5cabc123', // We'll update this when auth is added
    },
  })

  return NextResponse.json(problem)
}
