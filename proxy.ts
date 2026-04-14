import { default as nextAuthMiddleware } from "next-auth/middleware"

export function proxy(...args: Parameters<typeof nextAuthMiddleware>) {
  return nextAuthMiddleware(...args)
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/problems", "/problems/:path*", "/review", "/review/:path*", "/add", "/add/:path*", "/edit", "/edit/:path*"]
}
