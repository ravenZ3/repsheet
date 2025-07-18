import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma, Problem } from "@prisma/client";

type ProblemPatchBody = Partial<
  Omit<Problem, "id" | "userId" | "createdAt" | "updatedAt">
>;

function getIdFromRequest(request: NextRequest): string | null {
  const id = request.nextUrl.pathname.split("/").pop();
  return id ?? null;
}

export async function GET(request: NextRequest) {
  const id = getIdFromRequest(request);
  if (!id) {
    return NextResponse.json(
      { success: false, message: "No ID provided" },
      { status: 400 }
    );
  }

  try {
    const problem = await prisma.problem.findUnique({
      where: { id },
    });

    if (!problem) {
      return NextResponse.json(
        { success: false, message: "Problem not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, problem }, { status: 200 });
  } catch (error) {
    console.error("GET /api/problem/[id] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const id = getIdFromRequest(request);
  if (!id) {
    return NextResponse.json(
      { success: false, message: "No ID provided" },
      { status: 400 }
    );
  }

  try {
    const body: ProblemPatchBody = await request.json();

    const allowedUpdates: Partial<Problem> = {};
    if (body.name !== undefined) allowedUpdates.name = body.name;
    if (body.platform !== undefined) allowedUpdates.platform = body.platform;
    if (body.link !== undefined) allowedUpdates.link = body.link;
    if (body.difficulty !== undefined)
      allowedUpdates.difficulty = body.difficulty;
    if (body.status !== undefined) allowedUpdates.status = body.status;
    if (body.category !== undefined)
      allowedUpdates.category =  body.category ;
    if (body.notes !== undefined) allowedUpdates.notes = body.notes;
    if (body.mistakesMade !== undefined)
      allowedUpdates.mistakesMade = body.mistakesMade;

    if (body.dateSolved !== undefined) {
      allowedUpdates.dateSolved = body.dateSolved
        ? new Date(body.dateSolved)
        : null;
    }

    const updatedProblem = await prisma.problem.update({
      where: { id },
      data: allowedUpdates,
    });

    return NextResponse.json(
      { success: true, problem: updatedProblem },
      { status: 200 }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { success: false, message: "Problem not found to update" },
        { status: 404 }
      );
    }
    console.error("PATCH /api/problem/[id] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update problem" },
      { status: 500 }
    );
  }
}
