import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define public paths that don't require authentication
const publicPaths = ["/auth", "/login", "/register", "/api/auth"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public assets and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Get token from cookie
  const token = request.cookies.get("token")?.value;
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // Redirect unauthenticated users to auth page
  if (!token && !isPublicPath) {
    const url = new URL("/auth", request.url);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (token && isPublicPath) {
    const url = new URL("/dashboard", request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /_next (Next.js internals)
     * 2. /api (API routes)
     * 3. /static (static files)
     * 4. /_vercel (Vercel internals)
     * 5. All files within /public
     */
    "/((?!_next|api|static|_vercel|[\\w-]+\\.\\w+).*)",
  ],
};
