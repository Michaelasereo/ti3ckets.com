import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Basic middleware that guards dashboard and organizer routes
// by checking for presence of the `session` cookie.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('session')?.value;

  const isProtectedRoute =
    pathname.startsWith('/dashboard') || pathname.startsWith('/organizer');

  if (isProtectedRoute && !sessionCookie) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/organizer/:path*'],
};

