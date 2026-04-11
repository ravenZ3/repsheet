export { default } from "next-auth/middleware"

export const config = {
  matcher: ["/dashboard/:path*", "/problems/:path*", "/review/:path*", "/add/:path*", "/edit/:path*"]
}
