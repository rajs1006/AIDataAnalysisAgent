import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Check for auth token in cookies or headers
  const token =
    request.cookies.get("token")?.value || request.headers.get("authorization");
  const isAuthPage = request.nextUrl.pathname.startsWith("/auth");

  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const response = NextResponse.next();

  // Add security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
