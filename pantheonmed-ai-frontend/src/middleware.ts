import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Paths that require a valid access_token cookie.
 * Everything else is accessible as a guest.
 */
const PROTECTED_PREFIXES = ["/admin", "/health"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow Next.js internals and the API proxy path
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("access_token")?.value;

  // If the route requires auth and the user has no token → go to login
  if (!token && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Logged-in user landing on /login → send to dashboard
  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
