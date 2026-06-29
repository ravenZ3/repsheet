import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { getCatalog } from "@/lib/patterns";

/**
 * Feeds the Focused Practice tag-input autocomplete with both sources:
 * - skills: the signed-in user's distinct `category` values, sorted
 * - patterns: the static catalog's { id, name } list
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const problems = await prisma.problem.findMany({
      where: { userId: session.user.id },
      select: { category: true },
    });

    const skills = new Set<string>();
    for (const p of problems) {
      for (const c of p.category) {
        const tag = c.trim();
        if (tag) skills.add(tag);
      }
    }

    const patterns = getCatalog().patterns.map((p) => ({ id: p.id, name: p.name }));

    return NextResponse.json(
      {
        skills: Array.from(skills).sort((a, b) => a.localeCompare(b)),
        patterns,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET Skills Error:", error);
    return NextResponse.json({ error: "Failed to fetch skills" }, { status: 500 });
  }
}
