import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/extensionAuth";
import { corsJson, preflight } from "@/lib/extensionCors";
import { scheduleReview, isValidRating } from "@/lib/fsrs";
import { normalizeDifficulty } from "@/lib/difficulty";

export async function OPTIONS(req: NextRequest) {
  return preflight(req);
}

const captureSchema = z.object({
  name: z.string().min(1),
  platform: z.string().min(1),
  link: z.string().url(),
  difficulty: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  rating: z.number().int().min(1).max(4),
  platformRating: z.number().int().optional(),
});

/**
 * Full capture from the browser extension: create-or-find the problem by URL
 * (matching the sync's dedupe key), apply the FSRS rating, and record a Review —
 * all in one call so there's no race with the periodic sync.
 */
export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return corsJson(req, { success: false, message: "Unauthorized" }, 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return corsJson(req, { success: false, message: "Invalid JSON" }, 400);
  }

  const parsed = captureSchema.safeParse(body);
  if (!parsed.success) {
    return corsJson(req, { success: false, message: parsed.error.issues[0].message }, 400);
  }
  const data = parsed.data;

  if (!isValidRating(data.rating)) {
    return corsJson(req, { success: false, message: "Invalid rating" }, 400);
  }

  try {
    const now = new Date();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fsrsTargetRetention: true },
    });

    // Dedupe by URL scoped to the user — same key the sync uses.
    let problem = await prisma.problem.findFirst({
      where: { userId, link: data.link },
    });

    if (!problem) {
      problem = await prisma.problem.create({
        data: {
          userId,
          name: data.name,
          platform: data.platform,
          link: data.link,
          difficulty: normalizeDifficulty(data.difficulty),
          category: data.tags,
          platformRating: data.platformRating ?? null,
          dateSolved: now,
          nextReviewDate: now,
          reviewCount: 0,
        },
      });
    }

    const fsrsUpdate = scheduleReview(
      problem,
      data.rating,
      user?.fsrsTargetRetention ?? undefined,
      now
    );

    await prisma.problem.update({
      where: { id: problem.id },
      data: {
        ...fsrsUpdate,
        reviewCount: { increment: 1 },
      },
    });

    await prisma.review.create({
      data: { userId, problemId: problem.id, date: now, rating: data.rating },
    });

    return corsJson(req, {
      success: true,
      problemId: problem.id,
      nextReviewDate: fsrsUpdate.nextReviewDate,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Capture failed";
    console.error("Extension capture error:", error);
    return corsJson(req, { success: false, message }, 500);
  }
}
