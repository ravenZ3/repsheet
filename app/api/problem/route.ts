// --- STEP 1: Correct your imports ---
import { Prisma, Difficulty, Status } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
// Import the shared prisma instance
import prisma from "@/lib/prisma";

// --- This part is good, no changes needed ---
interface ProblemPostBody {
  name: string;
  platform: string;
  link: string;
  difficulty: string;
  status: string;
  category: string | string[];
  dateSolved?: string;
}

function isValidDifficulty(value: string): value is Difficulty {
  return Object.values(Difficulty).includes(value as Difficulty);
}

function isValidStatus(value: string): value is Status {
  return Object.values(Status).includes(value as Status);
}
// --- End of unchanged part ---

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // --- STEP 2: Simplify your authentication check ---
    // Use the user.id we added directly to the session.
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    // The unnecessary database call to find the user is now removed.

    const body: ProblemPostBody = await req.json();

    // Your validation logic here is excellent, no changes needed
    if (!body.name || !body.platform || !body.difficulty || !body.status || !body.category) {
      return NextResponse.json({ success: false, message: "Missing required fields." }, { status: 400 });
    }
    if (!isValidDifficulty(body.difficulty)) {
        return NextResponse.json({ success: false, message: `Invalid difficulty value.` }, { status: 400 });
    }
    if (!isValidStatus(body.status)) {
        return NextResponse.json({ success: false, message: `Invalid status value.` }, { status: 400 });
    }
    // ... all your other validation is good.

    const categories = Array.isArray(body.category)
      ? body.category.map((tag) => tag.trim()).filter(Boolean)
      : body.category.split(",").map((tag) => tag.trim()).filter(Boolean);

    if (categories.length === 0) {
      return NextResponse.json({ success: false, message: "Category field cannot be empty." }, { status: 400 });
    }

    const dateSolved = body.dateSolved ? new Date(body.dateSolved) : new Date();
    if (isNaN(dateSolved.getTime())) {
      return NextResponse.json({ success: false, message: "Invalid date format for dateSolved." }, { status: 400 });
    }

    const problem = await prisma.problem.create({
      data: {
        // --- STEP 3: Use the direct session user ID ---
        userId: session.user.id, // More efficient
        name: body.name,
        platform: body.platform,
        link: body.link,
        difficulty: body.difficulty,
        status: body.status,
        category: categories,
        dateSolved: dateSolved,
        nextReviewDate: dateSolved, // Assuming this is desired logic
        reviewCount: 0,
      },
    });

    return NextResponse.json({ success: true, problem }, { status: 201 });
  } catch (error: unknown) {
    // Your error handling is very good, no changes needed here.
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