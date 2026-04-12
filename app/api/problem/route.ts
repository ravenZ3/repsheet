import { Prisma, Difficulty } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import { z } from "zod";

const problemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  platform: z.string().min(1, "Platform is required"),
  link: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  difficulty: z.nativeEnum(Difficulty),
  isStuck: z.boolean().optional().default(false),
  category: z.union([z.string(), z.array(z.string())]).refine(
    (val) => (Array.isArray(val) ? val.length > 0 : val.trim().length > 0),
    { message: "Category field cannot be empty." }
  ),
  dateSolved: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = problemSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.issues[0].message }, { status: 400 });
    }
    
    const data = parsed.data;

    const categories = Array.isArray(data.category)
      ? data.category.map((tag) => tag.trim()).filter(Boolean)
      : data.category.split(",").map((tag) => tag.trim()).filter(Boolean);

    if (categories.length === 0) {
      return NextResponse.json({ success: false, message: "Category field cannot be empty." }, { status: 400 });
    }

    const dateSolved = data.dateSolved ? new Date(data.dateSolved) : new Date();
    if (isNaN(dateSolved.getTime())) {
      return NextResponse.json({ success: false, message: "Invalid date format for dateSolved." }, { status: 400 });
    }

    const problem = await prisma.problem.create({
      data: {
        userId: session.user.id,
        name: data.name,
        platform: data.platform,
        link: data.link || "",
        difficulty: data.difficulty,
        isStuck: data.isStuck,
        category: categories,
        dateSolved: dateSolved,
        nextReviewDate: dateSolved,
        reviewCount: 0,
      },
    });

    return NextResponse.json({ success: true, problem }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating problem:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const target = (error.meta?.target as string[])?.join(", ") || "fields";
        return NextResponse.json({ success: false, message: `A problem with this ${target} already exists.` }, { status: 409 });
      }
    }

    if (error instanceof Error) {
      return NextResponse.json({ success: false, message: `Failed to create problem: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: false, message: "An unexpected error occurred." }, { status: 500 });
  }
}