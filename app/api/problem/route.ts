import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Basic validation for required fields before Prisma operation
    if (!body.name || !body.platform || !body.link || !body.difficulty || !body.status || !body.category) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields for problem creation.' },
        { status: 400 }
      )
    }

    // Ensure category is an array of strings, splitting if it's a comma-separated string
    const categories = Array.isArray(body.category)
      ? body.category.map((tag: string) => tag.trim())
      : String(body.category).split(',').map((tag: string) => tag.trim()).filter(Boolean);

    // Validate dateSolved if provided, or set to current date if not
    let dateSolved: Date;
    if (body.dateSolved) {
      const parsedDate = new Date(body.dateSolved);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { success: false, message: 'Invalid date format for dateSolved.' },
          { status: 400 }
        );
      }
      dateSolved = parsedDate;
    } else {
      dateSolved = new Date(); // Default to current date if not provided
    }

    const problem = await prisma.problem.create({
      data: {
        name: body.name,
        platform: body.platform,
        link: body.link,
        difficulty: body.difficulty,
        status: body.status,
        category: categories,
        dateSolved: dateSolved,
        nextReviewDate: dateSolved, // For now, same day as solved
        reviewCount: 0,
        userId: '64d1f0f33a1c2b5e5cabc123', // Placeholder: Update this with actual user ID from authentication
      },
    })

    // Return a successful JSON response with the created problem data
    return NextResponse.json({ success: true, problem }, { status: 201 }) // 201 Created

  } catch (error: any) {
    console.error('Error creating problem:', error)

    // Handle specific Prisma errors if needed, e.g., unique constraint violations
    if (error.code === 'P2002') { // Prisma error code for unique constraint violation
      return NextResponse.json(
        { success: false, message: `A problem with this ${error.meta?.target} already exists.` },
        { status: 409 } // Conflict
      )
    }

    // Generic error response for any other unhandled errors
    return NextResponse.json(
      { success: false, message: `Failed to create problem: ${error.message || 'Unknown error'}` },
      { status: 500 } // Internal Server Error
    )
  } finally {
    // Disconnect Prisma client if it's not managed globally (e.g., in a singleton pattern)
    // If you have a global prisma client instance, you might not need this here.
    // await prisma.$disconnect();
  }
}
