import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Sensitive query params that must never appear in URLs (OWASP: no credentials in URLs).
const SENSITIVE_PARAMS = ['password', 'token', 'secret', 'apikey', 'api_key'];

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const { pathname, searchParams } = url;

  // Strip sensitive params from any URL (server-side, before page render or logging).
  const hasSensitiveParam = SENSITIVE_PARAMS.some((p) => searchParams.has(p));
  if (hasSensitiveParam) {
    SENSITIVE_PARAMS.forEach((p) => url.searchParams.delete(p));
    return NextResponse.redirect(url);
  }

  // Guard dashboard and organizer routes by presence of session cookie.
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
  // Auth routes: strip sensitive params. Dashboard/organizer: guard by session.
  matcher: ['/auth/:path*', '/dashboard/:path*', '/organizer/:path*'],
};

