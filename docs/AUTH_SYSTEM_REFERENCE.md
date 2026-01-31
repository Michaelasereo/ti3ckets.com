# Authentication System Reference

This document describes how the current auth system works: **session cookies**, where they are set/read, and how protected routes and API calls use them.

---

## 1. High-level flow

```mermaid
sequenceDiagram
  participant Browser
  participant WebNext as Next.js (Web)
  participant API as API (Express)
  participant Redis

  Browser->>WebNext: POST /api/v1/auth/login (email, password)
  WebNext->>API: proxy to API (rewrite)
  API->>API: verify password, load roles
  API->>Redis: createSession(sessionId, userId, email, roles)
  API->>Browser: Set-Cookie: session=<sessionId>; HttpOnly; SameSite=Strict
  API->>Browser: 200 { user }

  Note over Browser,API: Later requests
  Browser->>WebNext: GET /dashboard (Cookie: session=...)
  WebNext->>WebNext: middleware: has session cookie? allow
  Browser->>API: GET /api/v1/users/me (Cookie: session=...)
  API->>API: cookieParser, req.cookies.session
  API->>API: validateSession: SessionService.getSession(sessionId)
  API->>Redis: get sess:<sessionId>
  Redis-->>API: session data
  API->>API: req.user = { userId, email, roles, activeRole }
  API->>Browser: 200 { user data }
```

- **Login**: API verifies credentials, creates a session in Redis, sets an HTTP-only cookie named `session` with the session ID.
- **Subsequent requests**: Browser sends the cookie; API (and optionally Next.js) read it and resolve the user from Redis.

---

## 2. Session cookie: where it is set

**API (primary in dev)** – [apps/api/src/routes/auth.ts](apps/api/src/routes/auth.ts)

After successful login:

```ts
// Create session in Redis
const sessionService = new SessionService(req.redis);
const sessionId = await sessionService.createSession({
  userId: user.id,
  email: user.email,
  roles: roles.length > 0 ? roles : ['BUYER'],
  ipAddress: req.ip || '',
  userAgent: req.headers['user-agent'] || '',
});

// Set HTTP-only cookie (8 hours)
const maxAge = 28800; // seconds
res.cookie('session', sessionId, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: maxAge * 1000,
  path: '/',
});
```

**Next.js fallback** – [apps/web/app/api/v1/auth/login/route.ts](apps/web/app/api/v1/auth/login/route.ts)

When the request is not proxied to the API (e.g. API down, production without proxy), the Next.js route creates a session via [apps/web/lib/session.ts](apps/web/lib/session.ts) (Redis) and sets the same cookie:

```ts
response.cookies.set('session', sessionId, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge,
  path: '/',
});
```

Cookie name everywhere: **`session`**. Value: **opaque session ID** (no user data in the cookie).

---

## 3. Session storage (Redis + fallback)

**API** – [apps/api/src/services/session.ts](apps/api/src/services/session.ts)

- Session data: `userId`, `email`, `roles`, `activeRole`, `createdAt`, `lastActivity`, `ipAddress`, `userAgent`.
- Stored in Redis under key `sess:<sessionId>` with TTL:
  - **Buyers**: 28800 s (8 hours).
  - **Organizers**: 7200 s (2 hours).
- If Redis is unavailable, the API falls back to an **in-memory** store (dev-friendly).

**Web (Next.js fallback login only)** – [apps/web/lib/session.ts](apps/web/lib/session.ts)

- Same shape; uses `redis` from [apps/web/lib/redis.ts](apps/web/lib/redis.ts) (`REDIS_URL` or `redis://localhost:6379`).
- No in-memory fallback; Redis must be available for that route to work.

---

## 4. Where the cookie is read and session is validated

### 4.1 API: cookie parsing and auth middleware

**Cookie parsing** – [apps/api/src/app.ts](apps/api/src/app.ts)

```ts
app.use(cookieParser(
  process.env.COOKIE_SECRET || 'your-cookie-secret-change-this-in-production-min-32-chars'
));
```

**Redis on request** – [apps/api/src/app.ts](apps/api/src/app.ts)

```ts
app.use((req, res, next) => {
  req.redis = redisService;
  next();
});
```

**Session validation** – [apps/api/src/middleware/auth.ts](apps/api/src/middleware/auth.ts)

- Reads `req.cookies.session` (session ID).
- Loads session from Redis via `SessionService(req.redis).getSession(sessionId)`.
- Checks inactivity timeout (same TTL as above); deletes session and clears cookie if expired.
- Calls `updateActivity(sessionId)` (debounced).
- Sets `req.session` and `req.user`:

```ts
req.session = session;
req.user = {
  userId: session.userId,
  email: session.email,
  roles: session.roles,
  activeRole: session.activeRole,
};
```

**Protected routes** use `validateSession` or `authenticate` (session first, then JWT fallback). Example: [apps/api/src/routes/users.ts](apps/api/src/routes/users.ts) – `GET /api/v1/users/me` uses `validateSession`.

### 4.2 Web: Next.js middleware (route protection)

**Middleware** – [apps/web/middleware.ts](apps/web/middleware.ts)

- Only checks **presence** of the `session` cookie for `/dashboard/*` and `/organizer/*`.
- Does **not** validate the session with the API or Redis; no server call.

```ts
const sessionCookie = request.cookies.get('session')?.value;
const isProtectedRoute =
  pathname.startsWith('/dashboard') || pathname.startsWith('/organizer');

if (isProtectedRoute && !sessionCookie) {
  const loginUrl = new URL('/auth/login', request.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}
```

So: **no cookie → redirect to login**. Cookie present → allow through; actual auth is enforced when the app calls the API.

### 4.3 Web: sending the cookie to the API

**API client** – [apps/web/lib/api.ts](apps/web/lib/api.ts)

```ts
const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,  // send cookies with cross-origin requests
  ...
});
```

All requests to the API (same origin when proxied, or cross-origin if `NEXT_PUBLIC_API_URL` is set) send the `session` cookie. The API then uses `cookieParser` + `validateSession` as above.

### 4.4 Web: server-side “current user” (e.g. layouts)

**Server auth** – [apps/web/lib/auth/server.ts](apps/web/lib/auth/server.ts)

- Reads `session` from Next.js `cookies()`.
- Calls `GET /api/v1/users/me` with `Cookie: session=<sessionId>`.
- Returns current user for server components/layouts; uses React `cache()` so one request per incoming request.

**Optional: getAuthFromRequest** – [apps/web/lib/auth.ts](apps/web/lib/auth.ts)

- Used when you need auth from a raw `Request` (e.g. API routes).
- Parses `cookie` header for `session=...`, then loads and validates session via [apps/web/lib/session.ts](apps/web/lib/session.ts) (Redis). Also supports JWT and mock tokens.

---

## 5. Logout

**API** – [apps/api/src/routes/auth.ts](apps/api/src/routes/auth.ts)

```ts
router.post('/logout', asyncHandler(async (req, res) => {
  const sessionId = req.cookies.session;
  if (sessionId) {
    const sessionService = new SessionService(req.redis);
    await sessionService.deleteSession(sessionId);
  }
  res.clearCookie('session', { path: '/' });
  res.json({ success: true });
}));
```

Client calls `POST /api/v1/auth/logout` (with credentials so the cookie is sent); API deletes the session from Redis and clears the cookie.

---

## 6. Role switching (BUYER / ORGANIZER)

**API** – [apps/api/src/routes/auth.ts](apps/api/src/routes/auth.ts) – `POST /api/v1/auth/switch-role`

- Reads `req.cookies.session`, loads session from Redis.
- Updates `activeRole` in the session store via `SessionService.updateActiveRole(sessionId, role)`.
- Cookie value (session ID) does not change; only server-side session data changes.

Protected organizer routes then use `req.user.activeRole` (and/or `requireRole(ORGANIZER)`).

---

## 7. Relevant files summary

| Layer | File | Purpose |
|-------|------|--------|
| API | [apps/api/src/app.ts](apps/api/src/app.ts) | `cookieParser`, attach `req.redis` |
| API | [apps/api/src/routes/auth.ts](apps/api/src/routes/auth.ts) | Login (set cookie), logout (clear + delete session), GET session, switch-role |
| API | [apps/api/src/services/session.ts](apps/api/src/services/session.ts) | Create/get/update/delete session in Redis (or in-memory fallback) |
| API | [apps/api/src/middleware/auth.ts](apps/api/src/middleware/auth.ts) | `validateSession` (cookie → Redis → req.user), `requireRole`, JWT fallback |
| API | [apps/api/src/routes/users.ts](apps/api/src/routes/users.ts) | `GET /users/me` behind `validateSession` |
| API | [apps/api/src/types/express.d.ts](apps/api/src/types/express.d.ts) | `Request`: `user`, `session`, `prisma`, `redis` |
| Web | [apps/web/middleware.ts](apps/web/middleware.ts) | Guard /dashboard, /organizer by presence of `session` cookie |
| Web | [apps/web/lib/api.ts](apps/web/lib/api.ts) | `withCredentials: true` so cookies are sent |
| Web | [apps/web/lib/session.ts](apps/web/lib/session.ts) | SessionService for Next.js fallback login; Redis only |
| Web | [apps/web/lib/auth/server.ts](apps/web/lib/auth/server.ts) | `getCurrentUser()`: cookie → GET /users/me |
| Web | [apps/web/lib/auth.ts](apps/web/lib/auth.ts) | `getAuthFromRequest`: cookie or JWT for API routes |
| Web | [apps/web/app/api/v1/auth/login/route.ts](apps/web/app/api/v1/auth/login/route.ts) | Fallback login when API is not used; sets same cookie |
| Web | [apps/web/hooks/useAuth.ts](apps/web/hooks/useAuth.ts) | Client: `usersApi.getMe()` to know if user is logged in |

---

## 8. Cookie attributes (security)

- **Name**: `session`
- **Value**: Opaque session ID (e.g. 64-char hex)
- **httpOnly**: `true` – not readable by JavaScript (mitigates XSS stealing the token)
- **secure**: `true` in production – only over HTTPS
- **sameSite**: `strict` – not sent on cross-site requests (CSRF mitigation)
- **path**: `/` – sent for all paths on the same origin
- **maxAge**: 8 hours (buyers) or 2 hours (organizers) on create; same TTL in Redis

No user data or password is stored in the cookie; only the session ID. All identity comes from Redis (or in-memory fallback on the API).
