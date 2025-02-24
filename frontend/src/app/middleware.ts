import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const path = request.nextUrl.pathname;

  const publicPaths = ['/auth/login', '/auth/register', '/auth/verify', '/auth/reset-password'];
  const isPublicPath = publicPaths.includes(path);

  // If trying to access a public path while authenticated, redirect to dashboard
  if (isPublicPath && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If trying to access a protected path without authentication, redirect to login
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/auth/login',
    '/auth/register',
    '/auth/verify',
    '/auth/reset-password'
  ]
}
