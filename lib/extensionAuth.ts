import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { decode } from "next-auth/jwt";
import { authOptions } from "@/lib/authOptions";

export const SESSION_HEADER = "x-repsheet-session";

/**
 * Resolves the authenticated user id for a request that may come from either
 * the website (same-origin session cookie) or the browser extension
 * (the session JWT relayed in the `X-Repsheet-Session` header).
 *
 * The app uses the `jwt` session strategy, so the session token is an encrypted
 * JWE — there are no Session DB rows. We decode it with NEXTAUTH_SECRET; the
 * `jwt` callback in authOptions sets `token.id = user.id`.
 *
 * Returns the user id, or null if unauthenticated.
 */
export async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  // 1. Same-origin website callers: normal NextAuth session.
  const session = await getServerSession(authOptions);
  if (session?.user?.id) return session.user.id;

  // 2. Extension callers: relayed session JWT in a header.
  const headerToken = req.headers.get(SESSION_HEADER);
  if (!headerToken) return null;

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  try {
    const decoded = await decode({ token: headerToken, secret });
    const id = decoded?.id;
    return typeof id === "string" ? id : null;
  } catch {
    return null;
  }
}
