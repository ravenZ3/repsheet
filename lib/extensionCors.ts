import { NextRequest, NextResponse } from "next/server";
import { SESSION_HEADER } from "@/lib/extensionAuth";

/**
 * CORS for the extension endpoints. Requests originate from
 * `chrome-extension://…` and `moz-extension://…` origins. Auth is carried in a
 * custom header (not cookies), so we reflect the extension origin and allow the
 * session header. We do NOT allow credentials, keeping the surface minimal.
 */
function isExtensionOrigin(origin: string | null): boolean {
  return !!origin && (origin.startsWith("chrome-extension://") || origin.startsWith("moz-extension://"));
}

export function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowOrigin = isExtensionOrigin(origin) ? origin! : "";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": `Content-Type, ${SESSION_HEADER}`,
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/** Standard response to a CORS preflight (OPTIONS) request. */
export function preflight(req: NextRequest): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

/** Wrap a JSON payload with the appropriate CORS headers. */
export function corsJson(req: NextRequest, body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: corsHeaders(req) });
}
