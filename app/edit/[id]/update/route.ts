import { PrismaClient, Difficulty, Status } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

// Helper to validate that a value is a valid Difficulty
// The fix is to use `unknown` instead of `any`
function isValidDifficulty(value: unknown): value is Difficulty {
  // Object.values returns the enum's values, e.g., ['Easy', 'Medium', 'Hard']
  // .includes() can safely check if the unknown value is one of them
  return Object.values(Difficulty).includes(value as Difficulty);
}

// Helper to validate that a value is a valid Status
// The fix is to use `unknown` instead of `any`
function isValidStatus(value: unknown): value is Status {
  return Object.values(Status).includes(value as Status);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const id = formData.get('id') as string;
    
    // formData.get() returns `FormDataEntryValue | null` which is compatible with `unknown`
    const difficulty = formData.get('difficulty');
    const status = formData.get('status');
    const name = formData.get('name') as string;

    // --- VALIDATION LOGIC ---
    if (!id || !name) {
      // It's better to return a proper response than just redirecting on failure
      return NextResponse.json({ message: "Missing required fields like ID or name" }, { status: 400 });
    }

    if (!isValidDifficulty(difficulty)) {
      return NextResponse.json(
        { message: `Invalid difficulty. Must be one of: ${Object.values(Difficulty).join(", ")}` },
        { status: 400 }
      );
    }

    if (!isValidStatus(status)) {
      return NextResponse.json(
        { message: `Invalid status. Must be one of: ${Object.values(Status).join(", ")}` },
        { status: 400 }
      );
    }
    // --- END VALIDATION ---

    await prisma.problem.update({
      where: { id },
      data: {
        name: name,
        link: formData.get('link') as string,
        platform: formData.get('platform') as string,
        difficulty: difficulty, // This is now safe and correctly typed
        status: status,         // This is also safe and correctly typed
        category: (formData.get('category') as string).split(',').map((x) => x.trim()),
      },
    });

    // Redirect to a different page on success
    const redirectUrl = new URL('/review', req.url);
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error("Update failed:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ message: "Failed to update problem", error: message }, { status: 500 });
  }
}