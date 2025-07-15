import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const id = formData.get('id') as string

  await prisma.problem.delete({ where: { id } })

  return NextResponse.redirect(new URL('/review', req.url))
}
