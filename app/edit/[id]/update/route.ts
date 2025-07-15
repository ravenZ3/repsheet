import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const id = formData.get('id') as string

  await prisma.problem.update({
    where: { id },
    data: {
      name: formData.get('name') as string,
      link: formData.get('link') as string,
      platform: formData.get('platform') as string,
      difficulty: formData.get('difficulty') as string,
      status: formData.get('status') as string,
      category: (formData.get('category') as string).split(',').map((x) => x.trim()),
    },
  })

  return NextResponse.redirect(new URL('/review', req.url))
}
