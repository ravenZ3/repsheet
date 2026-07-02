import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Difficulty } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { z } from "zod";

// Field allowlist AND type validation: without the schema, a bad
// difficulty/category type reaches Prisma and surfaces as a 500, and an empty
// name would be written silently.
const patchSchema = z.object({
  name: z.string().trim().min(1, "Name cannot be empty").optional(),
  platform: z.string().trim().min(1, "Platform cannot be empty").optional(),
  notes: z.string().nullable().optional(),
  mistakesMade: z.string().nullable().optional(),
  difficulty: z.nativeEnum(Difficulty).optional(),
  isStuck: z.boolean().optional(),
  isStarred: z.boolean().optional(),
  category: z
    .array(z.string())
    .transform((tags) => tags.map((t) => t.trim()).filter(Boolean))
    .refine((tags) => tags.length > 0, { message: "Category cannot be empty" })
    .optional(),
});

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

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.issues[0].message }, { status: 400 });
    }

    // Only forward the keys the client actually sent.
    const updateData = Object.fromEntries(
      Object.entries(parsed.data).filter(([, v]) => v !== undefined)
    );
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