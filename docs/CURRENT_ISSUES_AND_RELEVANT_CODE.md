# Current Issues & Relevant Code — Senior Dev Review

**Generated:** 2025-01-30  
**Scope:** getiickets monorepo (apps/web, apps/api, packages/database)

---

## 1. Debug Logging Left in Production Code

**Issue:** `console.log` / `console.warn` with `[DEBUG]` prefixes run in all environments. Should be gated (e.g. `NODE_ENV === 'development'`) or removed before production.

### 1.1 Homepage — `apps/web/app/page.tsx`

```14:56:apps/web/app/page.tsx
async function getHomeEvents() {
  console.log('[DEBUG] HomePage getHomeEvents: start');
  try {
    // ...
    console.log('[DEBUG] HomePage getHomeEvents: ok, count=', events.length);
    return events;
  } catch (err) {
    console.error('[DEBUG] HomePage getHomeEvents failed:', err);
    return [];
  }
}
// ...
  console.log('[DEBUG] HomePage: render start');
  const initialEvents = await getHomeEvents();
  console.log('[DEBUG] HomePage: render, events=', initialEvents.length);
```

**Recommendation:** Remove or wrap in `if (process.env.NODE_ENV === 'development') { ... }`.

---

### 1.2 Auth Server — `apps/web/lib/auth/server.ts`

```73:89:apps/web/lib/auth/server.ts
  const url = `${apiBase}/api/v1/users/me`;
  console.log('[DEBUG] fetchCurrentUser: url', url);
  // ...
  console.log('[DEBUG] fetchCurrentUser: response', response.status, response.ok);
```

```128:132:apps/web/lib/auth/server.ts
export async function getCurrentUser(): Promise<CurrentUser> {
  const sessionId = getSessionIdFromCookies();
  console.log('[DEBUG] getCurrentUser: sessionId', sessionId ? 'present' : 'absent');
  const user = await getCurrentUserCached(sessionId);
  console.log('[DEBUG] getCurrentUser: result', user ? 'ok' : 'null');
  return user;
}
```

**Recommendation:** Same as above — dev-only or remove. Keep `console.warn` for real auth failures if desired, but avoid logging URLs/session presence in production.

---

### 1.3 Client Layout — `apps/web/app/ClientLayout.tsx`

```19:21:apps/web/app/ClientLayout.tsx
  useEffect(() => {
    console.log('[DEBUG] ClientLayout mounted in browser', { user: initialUser ? initialUser.id : null });
  }, [initialUser]);
```

**Recommendation:** Remove or gate; this runs in the browser for every user.

---

## 2. Unimplemented Features (TODOs)

### 2.1 Forgot Password — `apps/web/app/auth/forgot-password/page.tsx`

**Issue:** No backend; form simulates success after 1s.

```17:26:apps/web/app/auth/forgot-password/page.tsx
    try {
      // TODO: Implement API endpoint for forgot password
      // await authApi.forgotPassword({ email });
      
      // Simulate success for now
      setTimeout(() => {
        setSuccess(true);
        setLoading(false);
      }, 1000);
```

**Relevant:** UI and flow exist; need API (e.g. `/api/v1/auth/forgot-password`) + email (e.g. Brevo) + token storage and expiry.

---

### 2.2 Reset Password — `apps/web/app/auth/reset-password/page.tsx`

**Issue:** No backend; success is simulated.

```41:52:apps/web/app/auth/reset-password/page.tsx
    try {
      // TODO: Implement API endpoint for reset password
      // await authApi.resetPassword({ token, password });
      
      // Simulate success
      setTimeout(() => {
        setSuccess(true);
        setLoading(false);
        setTimeout(() => {
          router.push('/auth/login?reset=success');
        }, 2000);
      }, 1000);
```

**Relevant:** Depends on forgot-password flow (token in query). Need API that validates token and updates password.

---

### 2.3 Newsletter Signup — `apps/web/components/home/NewsletterSignup.tsx`

**Issue:** Submit does nothing except local state.

```9:15:apps/web/components/home/NewsletterSignup.tsx
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement newsletter signup
    setSubmitted(true);
    setEmail('');
    setTimeout(() => setSubmitted(false), 3000);
  };
```

**Relevant:** Need endpoint + storage (e.g. DB table or Brevo list) and consent/validation.

---

### 2.4 Organizer Waitlist “Notify All” — `apps/web/app/organizer/events/[id]/waitlist/page.tsx`

**Issue:** Button shows alert; no API.

```103:107:apps/web/app/organizer/events/[id]/waitlist/page.tsx
            <button
              onClick={() => {
                // TODO: Implement notification sending API
                alert('Notification feature coming soon. This will send emails to all waitlist members when tickets become available.');
              }}
```

**Relevant:** Need API to send emails (e.g. Brevo) to waitlist entries for the event; consider rate limiting and idempotency.

---

## 3. Middleware: `/admin` Not Protected

**Issue:** Middleware only protects `/dashboard` and `/organizer`. `/admin/*` is not in the matcher, so:

- Admin pages are reachable without redirect to login.
- Session is not required at the edge for `/admin`.

**Relevant code — `apps/web/middleware.ts`:**

```18:34:apps/web/middleware.ts
  // Guard dashboard and organizer routes by presence of session cookie.
  const sessionCookie = request.cookies.get('session')?.value;
  const isProtectedRoute =
    pathname.startsWith('/dashboard') || pathname.startsWith('/organizer');

  if (isProtectedRoute && !sessionCookie) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }
  // ...
  matcher: ['/auth/:path*', '/dashboard/:path*', '/organizer/:path*'],
```

**Recommendation:** Add `/admin` to protected routes and matcher, and ensure admin API routes enforce admin role (not just “logged in”).

---

## 4. Session / Redis Fallback

**Issue:** In production, if Redis is down, session creation throws. In dev, fallback to in-memory store is used. Worth confirming this is intentional and that prod Redis is monitored.

**Relevant — `apps/web/lib/session.ts`:**

```44:51:apps/web/lib/session.ts
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Redis set failed, using in-memory fallback:', error);
      redisAvailable = false;
      useInMemoryFallback = true;
    } else {
      throw error;
    }
  }
```

```116:118:apps/web/lib/session.ts
    } else {
      throw new Error('Redis unavailable and in-memory fallback only allowed in development');
    }
```

**Recommendation:** Document that production requires Redis; consider health checks and alerting on Redis.

---

## 5. Error Handling and Logging

**Observation:** Many routes and components use `console.error` for failures. No structured logger or log levels.

**Examples:**

- `apps/web/app/api/launch-waitlist/route.ts` — `console.error('[launch-waitlist]', err)`
- `apps/web/lib/brevo.ts` — `console.error('Brevo verification email error:', ...)` then `throw`
- `apps/web/app/api/v1/webhooks/paystack/route.ts` — `console.error` for missing order / ticket generation
- Various admin/organizer/checkout pages — `console.error` in catch blocks

**Recommendation:** For production, consider a small logger utility (or existing lib) that:

- Respects `NODE_ENV` (e.g. no verbose logs in production).
- Optionally forwards errors to a service (e.g. Sentry).
- Avoids logging PII or raw request bodies.

---

## 6. Linting and Build

- **Linter:** No current linter errors reported in the workspace.
- **Git status:** Many modified and new files (auth, admin, waitlist, payments, etc.). Suggest full regression and a quick pass for remaining `[DEBUG]` / `TODO` before release.

---

## Quick Checklist for Senior Dev

| Item | Priority | Action |
|------|----------|--------|
| Remove or gate `[DEBUG]` logs (page, auth/server, ClientLayout) | High | Before prod |
| Implement forgot-password API + email | Medium | Feature |
| Implement reset-password API (token + update password) | Medium | Feature |
| Implement newsletter signup backend | Low | Feature |
| Implement waitlist “Notify All” API | Medium | Feature |
| Protect `/admin` in middleware + enforce admin role in API | High | Security |
| Session/Redis: document and monitor in prod | Medium | Ops |
| Introduce structured logging / error reporting | Medium | Tech debt |

---

*Relevant code paths above are referenced by file and line ranges. Run a final search for `[DEBUG]` and `TODO` in `apps/web` (excluding `node_modules` and `.netlify`) to catch any further occurrences.*
