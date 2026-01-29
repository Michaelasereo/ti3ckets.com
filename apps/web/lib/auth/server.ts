import { cache } from 'react';
import { cookies } from 'next/headers';

export type CurrentUser = {
  id: string;
  email?: string;
  name?: string;
  roles?: string[];
  activeRole?: string;
} | null;

// Read the raw session ID from the cookie jar in a server component or layout.
export function getSessionIdFromCookies(): string | null {
  const cookieStore = cookies();
  return cookieStore.get('session')?.value ?? null;
}

const AUTH_FETCH_TIMEOUT_MS = 2000;

// Request-scoped: multiple calls to getCurrentUser() in the same request reuse this.
async function fetchCurrentUser(sessionId: string): Promise<CurrentUser> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '';
  const url = apiBase ? `${apiBase}/api/v1/users/me` : 'http://localhost:3000/api/v1/users/me';

  const fetchPromise = fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `session=${sessionId}`,
    },
    cache: 'no-store',
  });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Auth fetch timeout')), AUTH_FETCH_TIMEOUT_MS)
  );

  const response = await Promise.race([fetchPromise, timeoutPromise]);

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
  } catch {
    return null;
  }
});

// Fetch the current user by calling the existing API route using the same origin.
// Deduplicated per request via React cache(); one /users/me call per request.
export async function getCurrentUser(): Promise<CurrentUser> {
  const sessionId = getSessionIdFromCookies();
  return getCurrentUserCached(sessionId);
}

