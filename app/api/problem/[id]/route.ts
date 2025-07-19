import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Problem } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

/**
 * Handles fetching a single problem securely.
 * GET /api/problem/[id]
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } // Correctly typed as a Promise
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // --- THE FIX APPLIED TO GET ---
    const awaitedParams = await context.params;
    const { id } = awaitedParams;
    // --- END OF FIX ---

    if (!id) {
        return NextResponse.json({ success: false, message: "Could not determine problem ID" }, { status: 400 });
    }

    const problem = await prisma.problem.findFirst({
      where: {
        id: id,
        userId: session.user.id, // Ensures user can only fetch their own problems
      },
    });

    if (!problem) {
      return NextResponse.json({ success: false, message: "Problem not found or permission denied" }, { status: 404 });
    }

    return NextResponse.json(problem, { status: 200 });
  } catch(error) {
    console.error("GET Error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch problem" }, { status: 500 });
  }
}

/**
 * Handles securely updating a single problem.
 * PATCH /api/problem/[id]
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } // Correctly typed as a Promise
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const awaitedParams = await context.params;
    const { id } = awaitedParams;

    if (!id) {
      return NextResponse.json({ success: false, message: "Could not determine problem ID" }, { status: 400 });
    }

    const updateData: Partial<Problem> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.platform !== undefined) updateData.platform = body.platform;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.mistakesMade !== undefined) updateData.mistakesMade = body.mistakesMade;
    // ... etc, for all updatable fields

    const updateResult = await prisma.problem.updateMany({
      where: {
        id: id,
        userId: session.user.id,
      },
      data: updateData,
    });

    if (updateResult.count === 0) {
      return NextResponse.json({ success: false, message: "Problem not found or permission denied" }, { status: 404 });
    }

    const updatedProblem = await prisma.problem.findUnique({ where: { id: id } });

    return NextResponse.json(updatedProblem, { status: 200 });
  } catch (error) {
    console.error("PATCH Error:", error);
    return NextResponse.json({ success: false, message: "Failed to update problem" }, { status: 500 });
  }
}