import { cache } from 'react';
import { cookies } from 'next/headers';

export type CurrentUser = {
  id: string;
  email?: string;
  name?: string;
  roles?: string[];
  activeRole?: string;
} | null;

const AUTH_FETCH_TIMEOUT_MS = 3000;
const AUTH_FETCH_RETRIES = 1;

/** API base URL: in dev use same origin so Next rewrites /api/* to backend; in prod use env. */
function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  return '';
}

/** Fetch with timeout and optional retries. */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  config: { retries: number; timeout: number } = { retries: 1, timeout: AUTH_FETCH_TIMEOUT_MS }
): Promise<Response> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= config.retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error: unknown) {
      const err = error as Error & { name?: string };
      lastError = err;
      if (err?.name === 'AbortError') {
        console.warn(`[AUTH] Fetch timeout on attempt ${attempt + 1}`);
      } else {
        console.warn(`[AUTH] Fetch error on attempt ${attempt + 1}:`, err?.message);
      }
      if (attempt < config.retries) {
        await new Promise((r) => setTimeout(r, 100 * Math.pow(2, attempt)));
        continue;
      }
    }
  }
  throw lastError ?? new Error('Auth fetch failed');
}

// Read the raw session ID from the cookie jar in a server component or layout.
export function getSessionIdFromCookies(): string | null {
  try {
    const cookieStore = cookies();
    return cookieStore.get('session')?.value ?? null;
  } catch (error) {
    console.warn('[AUTH] Failed to read cookies:', error);
    return null;
  }
}

async function fetchCurrentUser(sessionId: string): Promise<CurrentUser> {
  const apiBase = getApiBaseUrl();
  const url = `${apiBase}/api/v1/users/me`;
  console.log('[DEBUG] fetchCurrentUser: url', url);

  const response = await fetchWithRetry(
    url,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `session=${sessionId}`,
      },
    },
    { retries: AUTH_FETCH_RETRIES, timeout: AUTH_FETCH_TIMEOUT_MS }
  );

  console.log('[DEBUG] fetchCurrentUser: response', response.status, response.ok);

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  if (!data?.success || !data?.data) {
    return null;
  }

  const user = data.data as {
    id: string;
    email?: string;
    name?: string;
    roles?: string[];
    activeRole?: string;
  };

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roles: user.roles,
    activeRole: user.activeRole,
  };
}

const getCurrentUserCached = cache(async (sessionId: string | null): Promise<CurrentUser> => {
  if (!sessionId) {
    return null;
  }
  try {
    return await fetchCurrentUser(sessionId);
  } catch (error) {
    console.warn('[AUTH] Failed to fetch user:', error);
    return null;
  }
});

export async function getCurrentUser(): Promise<CurrentUser> {
  const sessionId = getSessionIdFromCookies();
  console.log('[DEBUG] getCurrentUser: sessionId', sessionId ? 'present' : 'absent');
  const user = await getCurrentUserCached(sessionId);
  console.log('[DEBUG] getCurrentUser: result', user ? 'ok' : 'null');
  return user;
}
