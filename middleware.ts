export { default } from "next-auth/middleware"

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/problems", "/problems/:path*", "/review", "/review/:path*", "/add", "/add/:path*", "/edit", "/edit/:path*"]
}
