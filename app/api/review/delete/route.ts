import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
// STEP 1: Import the tools needed for authentication
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/authOptions' // Ensure this path is correct

export async function DELETE(req: NextRequest) {
  // STEP 2: Get the user's session to identify who is making this request
  const session = await getServerSession(authOptions);

  // STEP 3: Protect the route. If no session, deny access immediately.
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { id: problemIdToDelete } = await req.json();

    if (!problemIdToDelete) {
      return NextResponse.json({ error: 'Problem ID is required' }, { status: 400 });
    }

    // STEP 4: Perform a SECURE deletion.
    // Instead of a simple `delete`, we use `deleteMany`. This lets us create a
    // compound `where` clause that checks for TWO things at once:
    //   1. The `id` of the problem must match.
    //   2. The `userId` on that problem must match the ID of the person making the request.
    const deleteResult = await prisma.problem.deleteMany({
      where: {
        id: problemIdToDelete,
        userId: session.user.id, // <-- THE SECURITY CHECK
      },
    });

    // STEP 5: Check if anything was actually deleted.
    // If `count` is 0, it means no record was found that matched BOTH criteria.
    // This correctly handles cases where the problem doesn't exist OR the user doesn't own it.
    if (deleteResult.count === 0) {
      return NextResponse.json({ error: 'Problem not found or you do not have permission to delete it' }, { status: 404 });
    }

    // If count is 1 (or more), the deletion was successful.
    return NextResponse.json({ success: true }, { status: 200 });
    
  } catch (err) {
    console.error("[API_DELETE_ERROR]", err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to delete problem';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}