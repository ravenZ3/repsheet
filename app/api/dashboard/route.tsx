import { NextResponse } from "next/server";
// --- STEP 1: Correct your imports ---
import prisma from "@/lib/prisma"; // Use the shared prisma instance
import { format } from "date-fns";
// Import authentication tools
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

// REMOVE: const prisma = new PrismaClient()

export async function GET() {
  // --- STEP 2: Authenticate the user ---
  const session = await getServerSession(authOptions);

  // --- STEP 3: Protect the route ---
  if (!session || !session.user?.id) {
    // If there's no session, return an empty or error state for the dashboard
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // --- STEP 4: Use the SECURE session ID for the query ---
  const problems = await prisma.problem.findMany({
    where: {
      userId: session.user.id, // <-- THE SECURITY FIX
    },
    select: { status: true, difficulty: true, dateSolved: true },
  });

  // --- The rest of your logic is excellent and requires no changes ---

  const countBy = (key: "status" | "difficulty") => {
    const result: Record<string, number> = {};
    for (const p of problems) {
      const k = p[key] || "Unknown";
      result[k] = (result[k] || 0) + 1;
    }
    return Object.entries(result).map(([name, value]) => ({ name, value }));
  };

  const heatmap = problems.reduce((acc, p) => {
    if (!p.dateSolved) return acc;
    const key = format(new Date(p.dateSolved), "yyyy-MM-dd");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const heatmapArray = Object.entries(heatmap).map(([date, count]) => ({
    date,
    count,
  }));

  return NextResponse.json({
    status: countBy("status"),
    difficulty: countBy("difficulty"),
    heatmap: heatmapArray,
  });
}