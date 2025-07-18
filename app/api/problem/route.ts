import { PrismaClient, Prisma, Difficulty, Status } from "@prisma/client"; // Import Enums
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const prisma = new PrismaClient();

interface ProblemPostBody {
  name: string;
  platform: string;
  link: string;
  difficulty: string; // Stays as string for incoming body
  status: string;     // Stays as string for incoming body
  category: string | string[];
  dateSolved?: string;
}

// Helper to validate that a string is a valid Difficulty
function isValidDifficulty(value: string): value is Difficulty {
  return Object.values(Difficulty).includes(value as Difficulty);
}

// Helper to validate that a string is a valid Status
function isValidStatus(value: string): value is Status {
  return Object.values(Status).includes(value as Status);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const body: ProblemPostBody = await req.json();

    if (
      !body.name ||
      !body.platform ||
      !body.difficulty ||
      !body.status ||
      !body.category
    ) {
      return NextResponse.json(
        { success: false, message: "Missing required fields." },
        { status: 400 }
      );
    }
    
    // --- VALIDATION LOGIC ---
    if (!isValidDifficulty(body.difficulty)) {
        return NextResponse.json(
            { success: false, message: `Invalid difficulty. Must be one of: ${Object.values(Difficulty).join(", ")}` },
            { status: 400 }
        );
    }

    if (!isValidStatus(body.status)) {
        return NextResponse.json(
            { success: false, message: `Invalid status. Must be one of: ${Object.values(Status).join(", ")}` },
            { status: 400 }
        );
    }
    // --- END VALIDATION ---


    const categories = Array.isArray(body.category)
      ? body.category.map((tag) => tag.trim()).filter(Boolean)
      : body.category.split(",").map((tag) => tag.trim()).filter(Boolean);

    if (categories.length === 0) {
      return NextResponse.json(
        { success: false, message: "Category field cannot be empty." },
        { status: 400 }
      );
    }

    const dateSolved = body.dateSolved
      ? new Date(body.dateSolved)
      : new Date();
    if (isNaN(dateSolved.getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid date format for dateSolved." },
        { status: 400 }
      );
    }

    const problem = await prisma.problem.create({
      data: {
        userId: user.id,
        name: body.name,
        platform: body.platform,
        link: body.link,
        difficulty: body.difficulty, // Now this is safe
        status: body.status,         // And this is safe
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
        const target =
          (error.meta?.target as string[])?.join(", ") || "fields";
        return NextResponse.json(
          {
            success: false,
            message: `A problem with this ${target} already exists.`,
          },
          { status: 409 }
        );
      }
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, message: `Failed to create problem: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, message: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}