import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * GET /api/debug - Diagnostic endpoint to isolate layout 500 cause.
 * Checks: cookies, API reachability.
 * Visit http://localhost:3000/api/debug
 */
export async function GET() {
  try {
    // Test 1: Can we read cookies?
    let hasSession = false;
    try {
      const cookieStore = cookies();
      const session = cookieStore.get('session');
      hasSession = !!session?.value;
    } catch (cookieError: unknown) {
      const err = cookieError as Error;
      return NextResponse.json(
        {
          status: 'error',
          step: 'cookies',
          error: err?.message ?? String(cookieError),
          stack: err?.stack,
        },
        { status: 500 }
      );
    }

    // Test 2: Can we reach the API? Backend has GET /health (no /api prefix).
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
      process.env.API_URL?.replace(/\/$/, '') ||
      (process.env.NODE_ENV === 'development' ? 'http://localhost:8080' : '');
    const healthUrl = apiBase ? `${apiBase}/health` : 'http://localhost:8080/health';
    let apiStatus: number | null = null;
    let apiOk = false;
    let apiError: string | null = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(healthUrl, { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timeoutId);
      apiStatus = res.status;
      apiOk = res.ok;
    } catch (e: unknown) {
      apiError = (e as Error)?.message ?? String(e);
    }

    return NextResponse.json({
      status: 'ok',
      cookies: { hasSession },
      api: {
        url: healthUrl,
        status: apiStatus,
        ok: apiOk,
        error: apiError,
      },
      env: {
        NODE_ENV: process.env.NODE_ENV,
        hasNextPublicApiUrl: !!process.env.NEXT_PUBLIC_API_URL,
        hasApiUrl: !!process.env.API_URL,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      {
        status: 'error',
        error: err?.message ?? String(error),
        stack: err?.stack,
      },
      { status: 500 }
    );
  }
}
