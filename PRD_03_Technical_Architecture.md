# PRD 03: Technical Architecture

## System Architecture Overview

getiickets follows a **monorepo architecture** with separate frontend and backend applications, managed by Turbo for build orchestration and dependency management.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Browser                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Next.js Frontend (Port 3000)                  │  │
│  │  - React Components                                   │  │
│  │  - Next.js App Router                                 │  │
│  │  - API Routes (fallback/proxy)                        │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP (with rewrites in dev)
                        │
┌───────────────────────▼─────────────────────────────────────┐
│              Fastify API Server (Port 8080)                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Routes:                                              │  │
│  │  - /api/v1/events                                     │  │
│  │  - /api/v1/tickets                                    │  │
│  │  - /api/v1/orders                                     │  │
│  │  - /api/v1/payments                                   │  │
│  │  - /api/v1/auth                                       │  │
│  │  - /api/v1/organizer                                  │  │
│  │  - /api/v1/users                                      │  │
│  │  - /api/v1/webhooks                                   │  │
│  └───────────────────────────────────────────────────────┘  │
└───────┬───────────────┬───────────────┬─────────────────────┘
        │               │               │
        │               │               │
┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
│  PostgreSQL   │ │   Redis     │ │  External   │
│  (Supabase)   │ │  (Upstash)  │ │   APIs      │
│               │ │             │ │             │
│  - Users      │ │  - Sessions │ │  - Paystack │
│  - Events     │ │  - Cache    │ │  - Brevo    │
│  - Tickets    │ │  - Reserv.  │ │  - Twilio   │
│  - Orders     │ │             │ │  - AWS S3   │
└───────────────┘ └─────────────┘ └─────────────┘
```

## Monorepo Structure

```
getiickets/
├── apps/
│   ├── api/                    # Fastify backend API
│   │   ├── src/
│   │   │   ├── app.ts          # Fastify app setup
│   │   │   ├── server.ts       # Server entry point
│   │   │   ├── middleware/     # Auth middleware
│   │   │   ├── plugins/        # Fastify plugins (Prisma)
│   │   │   ├── routes/         # API route handlers
│   │   │   ├── services/       # Business logic services
│   │   │   └── scripts/        # Seed scripts
│   │   └── package.json
│   │
│   └── web/                    # Next.js frontend
│       ├── app/                # Next.js App Router pages
│       ├── components/        # React components
│       ├── hooks/              # React hooks
│       ├── lib/                # Utilities (API client, auth)
│       └── package.json
│
├── packages/
│   ├── database/               # Prisma schema
│   │   └── prisma/
│   │       └── schema.prisma
│   │
│   ├── shared/                 # Shared types and utilities
│   │   └── src/
│   │       ├── types/
│   │       └── utils/
│   │
│   └── config/                 # Shared configuration
│
├── turbo.json                  # Turbo build configuration
└── package.json                # Root package.json
```

## Technology Stack

### Frontend Stack

**Framework:**
- Next.js 14 (App Router)
- React 18
- TypeScript

**Styling:**
- Tailwind CSS
- Custom CSS variables for theming

**State Management:**
- React hooks (useState, useEffect)
- Local storage / Session storage for UI state
- HTTP-only cookies for authentication

**API Communication:**
- Axios with `withCredentials: true`
- Automatic cookie handling
- Error handling and retry logic

**Build Tools:**
- Next.js built-in bundler
- TypeScript compiler
- PostCSS for Tailwind

### Backend Stack

**Framework:**
- Fastify (high-performance web framework)
- TypeScript

**Database:**
- PostgreSQL (Supabase)
- Prisma ORM
- Connection pooling via Supabase PgBouncer

**Caching & Sessions:**
- Redis (Upstash)
- In-memory fallback for development

**Validation:**
- Zod for request/response validation
- Prisma for database constraints

**Authentication:**
- bcryptjs for password hashing
- HTTP-only cookies for sessions
- Role-based access control (RBAC)

**Utilities:**
- UUID for reservation IDs
- QRCode library for ticket QR codes
- PDF generation service

### Infrastructure & Services

**Database:**
- Supabase PostgreSQL
- Connection pooling (port 6543)
- Direct connection (port 5432) for migrations

**Cache & Sessions:**
- Upstash Redis
- In-memory fallback for development

**File Storage:**
- AWS S3
- CloudFront CDN (optional)

**Payment Processing:**
- Paystack API
- Webhook verification

**Email:**
- Brevo (formerly Sendinblue) API

**SMS:**
- Twilio API

## System Components

### Frontend Components

#### Pages (Next.js App Router)

**Public Pages:**
- `/` - Homepage
- `/events` - Event listing
- `/events/[slug]` - Event details
- `/auth/login` - Login page
- `/auth/register` - Registration page
- `/auth/forgot-password` - Password reset request
- `/auth/reset-password` - Password reset
- `/auth/verify-email` - Email verification
- `/auth/select-role` - Role selection (dual-role users)
- `/checkout` - Checkout page
- `/checkout/success` - Payment success
- `/faqs` - FAQ page
- `/support` - Support page
- `/privacy` - Privacy policy
- `/terms` - Terms of service
- `/refund-policy` - Refund policy

**Buyer Pages:**
- `/dashboard/tickets` - My tickets
- `/dashboard/orders` - Order history
- `/orders/[id]` - Order details
- `/onboarding/buyer` - Buyer profile completion

**Organizer Pages:**
- `/organizer/dashboard` - Organizer dashboard
- `/organizer/events/create` - Create event
- `/organizer/events/[id]` - Edit event
- `/organizer/events/[id]/analytics` - Event analytics
- `/organizer/events/[id]/orders` - Event orders
- `/organizer/events/[id]/seats` - Seat management
- `/organizer/events/[id]/waitlist` - Waitlist management
- `/organizer/events/[id]/check-in` - Check-in interface
- `/organizer/promo-codes` - Promo code list
- `/organizer/promo-codes/create` - Create promo code
- `/organizer/promo-codes/[id]` - Edit promo code
- `/organizer/signup` - Request organizer access
- `/onboarding/organizer` - Organizer profile completion

#### Components

**Layout Components:**
- `Header.tsx` - Global navigation with role switcher
- `Footer.tsx` - Site footer
- `RoleSwitcher.tsx` - Role switching dropdown

**Event Components:**
- `EventGrid.tsx` - Event listing grid
- `TicketSelector.tsx` - Ticket selection interface
- `SeatMap.tsx` - Seat selection map

**Ticket Components:**
- `TicketCard.tsx` - Ticket display card
- `TransferTicketModal.tsx` - Ticket transfer modal

**Form Components:**
- `PasswordInput.tsx` - Password input with show/hide
- `PasswordStrength.tsx` - Password strength indicator

**UI Components:**
- `Card.tsx` - Reusable card component
- `EmptyState.tsx` - Empty state display
- `LoadingSkeleton.tsx` - Loading placeholder
- `PageContainer.tsx` - Page layout wrapper

**Payment Components:**
- `PaystackButton.tsx` - Paystack payment button

**Home Components:**
- `Hero.tsx` - Homepage hero section
- `FeaturedEvents.tsx` - Featured events display
- `Categories.tsx` - Event categories
- `HowItWorks.tsx` - How it works section
- `NewsletterSignup.tsx` - Newsletter signup
- `TrustIndicators.tsx` - Trust indicators

#### Hooks

- `useProfileCheck.ts` - Profile completeness validation hook

#### Libraries

- `lib/api.ts` - Axios API client configuration
- `lib/auth.ts` - Authentication helpers
- `lib/session.ts` - Session management (Next.js API routes)
- `lib/redis.ts` - Redis client (Next.js API routes)
- `lib/db.ts` - Prisma client (Next.js API routes)

### Backend Components

#### Routes

**Public Routes:**
- `routes/events.ts` - Event listing, search, details
- `routes/tickets.ts` - Ticket availability, reservation, release
- `routes/orders.ts` - Order creation, retrieval
- `routes/payments.ts` - Payment initialization, verification
- `routes/promo-codes.ts` - Promo code validation
- `routes/waitlist.ts` - Waitlist management
- `routes/auth.ts` - Authentication (login, register, logout, session, role switching)

**Authenticated Routes:**
- `routes/users.ts` - User profile, tickets, orders
- `routes/organizer.ts` - Organizer event management
- `routes/organizer/promo-codes.ts` - Promo code CRUD
- `routes/tickets/transfer.ts` - Ticket transfer

**Webhook Routes:**
- `routes/webhooks.ts` - Paystack webhook handler

#### Services

**Core Services:**
- `services/session.ts` - Session management (Redis + in-memory fallback)
- `services/redis.ts` - Redis client wrapper with atomic operations
- `services/ticket.ts` - Ticket generation (QR codes, PDFs)
- `services/pdf.ts` - PDF generation for tickets
- `services/s3.ts` - AWS S3 file uploads

**Integration Services:**
- `services/paystack.ts` - Paystack payment API
- `services/brevo.ts` - Brevo email API
- `services/twilio.ts` - Twilio SMS API

#### Middleware

- `middleware/auth.ts` - Authentication and authorization middleware
  - `validateSession` - Session validation
  - `requireRole` - Role-based access control
  - `authenticate` - JWT fallback (backward compatibility)

#### Plugins

- `plugins/prisma.ts` - Prisma client plugin
  - Database connection management
  - Lifecycle hooks (connect on startup, disconnect on shutdown)
  - Health check helper

## Data Flow

### Request Flow (Development)

```
Browser Request
    ↓
Next.js (Port 3000)
    ↓
Next.js Rewrite (next.config.js)
    ↓
Fastify API (Port 8080)
    ↓
Middleware (Auth, Validation)
    ↓
Route Handler
    ↓
Service Layer
    ↓
Database (Prisma) / Redis / External APIs
    ↓
Response
```

### Session Flow

```
User Login
    ↓
Password Verification
    ↓
Load Roles from Database
    ↓
Create Session (SessionService)
    ↓
Store in Redis (or in-memory fallback)
    ↓
Set HTTP-only Cookie
    ↓
Return User Data
```

### Ticket Purchase Flow

```
User Selects Tickets
    ↓
Reserve Tickets (Redis Atomic Operation)
    ↓
Store Reservation in Database
    ↓
Navigate to Checkout
    ↓
Apply Promo Code (optional)
    ↓
Create Order
    ↓
Initialize Payment (Paystack)
    ↓
User Completes Payment
    ↓
Paystack Webhook
    ↓
Verify Payment
    ↓
Update Order Status
    ↓
Generate Tickets (QR codes, PDFs)
    ↓
Upload to S3
    ↓
Send Email/SMS Confirmation
```

## Integration Points

### Database Integration

**Prisma ORM:**
- Schema defined in `packages/database/prisma/schema.prisma`
- Client generated and shared across apps
- Connection pooling via Supabase PgBouncer
- Direct connection for migrations

**Connection Configuration:**
- Pooler URL: `postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`
- Direct URL: `postgresql://...@db.supabase.co:5432/postgres`
- Used for: Migrations, seed scripts

### Redis Integration

**Upstash Redis:**
- URL: `redis://default:...@mutual-jackal-29013.upstash.io:6379`
- Used for: Sessions, caching, ticket reservations
- Fallback: In-memory storage for development

**Redis Operations:**
- Session storage with TTL
- Event list caching (5 min TTL)
- Event detail caching (1 min TTL)
- Atomic ticket reservations (Lua scripts)

### Payment Integration

**Paystack:**
- API: `https://api.paystack.co`
- Endpoints:
  - `POST /transaction/initialize` - Initialize payment
  - `GET /transaction/verify/:reference` - Verify payment
- Webhook: Signature verification via HMAC SHA512
- Currency: NGN (Nigerian Naira)
- Amount: Converted to kobo (multiply by 100)

### Email Integration

**Brevo (formerly Sendinblue):**
- API: `https://api.brevo.com/v3`
- Endpoint: `POST /smtp/email`
- Used for: Ticket confirmations, notifications
- Graceful degradation: Logs warning if API key not configured

### SMS Integration

**Twilio:**
- API: Twilio SDK
- Used for: Ticket confirmation SMS
- Graceful degradation: Logs warning if not configured

### File Storage Integration

**AWS S3:**
- Service: `S3Service` class
- Used for: QR code images, ticket PDFs, event images
- Upload method: `uploadFile(key, buffer, mimeType)`
- Returns: Public URL

## API Architecture

### Route Organization

All API routes are prefixed with `/api/v1/`:

- `/api/v1/events` - Public event endpoints
- `/api/v1/tickets` - Ticket operations
- `/api/v1/orders` - Order management
- `/api/v1/payments` - Payment operations
- `/api/v1/auth` - Authentication
- `/api/v1/users` - User operations
- `/api/v1/organizer` - Organizer operations
- `/api/v1/promo-codes` - Promo code validation
- `/api/v1/waitlist` - Waitlist operations
- `/api/v1/webhooks` - Webhook handlers

### Authentication Architecture

**Session-Based Authentication:**
- HTTP-only cookies (secure, sameSite: strict)
- Session data stored in Redis
- Session ID: 64-character hex string (cryptographically secure)
- TTL: 8 hours (buyers), 2 hours (organizers)

**Role-Based Access Control:**
- Roles stored in `UserRole` table
- Middleware: `requireRole(request, reply, Role.ORGANIZER)`
- Active role context: `activeRole` in session ('buyer' | 'organizer')

**Backward Compatibility:**
- JWT fallback exists but not actively used
- `authenticate` middleware tries session first, falls back to JWT

### Caching Strategy

**Event Listings:**
- Cache key: `events:{category}:{city}:{date}:{page}:{limit}`
- TTL: 5 minutes
- Invalidation: Manual (on event updates)

**Event Details:**
- Cache key: `event:slug:{slug}` or `event:{id}`
- TTL: 1 minute
- Invalidation: Manual (on event updates)

**Redis Timeout Protection:**
- 1-second timeout for cache reads
- Graceful degradation: Continue without cache if Redis unavailable

### Error Handling Architecture

**Global Error Handler:**
- Fastify error handler in `app.ts`
- Validation errors: 400 with details
- Other errors: 500 with message
- Logging: All errors logged via Fastify logger

**Service-Level Error Handling:**
- Try-catch blocks in route handlers
- Graceful degradation for external services
- Timeout protection for Redis operations

## Development Architecture

### Development Setup

**Port Configuration:**
- Frontend: `localhost:3000`
- Backend: `localhost:8080`
- Next.js Rewrites: Proxy `/api/*` to Fastify in development

**Environment Variables:**
- `.env` files in each app directory
- Shared via Turbo global dependencies
- Separate configs for development and production

**Hot Reloading:**
- Next.js: Built-in Fast Refresh
- Fastify: `tsx watch` for backend
- Turbo: Monitors dependencies for rebuilds

### Build Process

**Turbo Pipeline:**
- `build` - Builds all apps and packages
- `dev` - Runs development servers
- `lint` - Lints all code
- `type-check` - TypeScript type checking

**Build Dependencies:**
- Packages built before apps
- Database package generates Prisma client
- Shared package provides types and utilities

## Security Architecture

### Authentication Security

- Password hashing: bcrypt with 10 rounds
- Session tokens: Cryptographically secure random bytes
- HTTP-only cookies: Prevents XSS attacks
- SameSite: strict - Prevents CSRF attacks
- Secure flag: Enabled in production

### Authorization Security

- Role verification on every protected endpoint
- Ownership verification for organizer resources
- Session validation on every authenticated request

### Data Security

- Input validation: Zod schemas on all endpoints
- SQL injection: Prevented by Prisma ORM
- XSS: Helmet CSP headers
- CORS: Whitelist of allowed origins

### External Service Security

- Paystack webhooks: HMAC SHA512 signature verification
- API keys: Stored in environment variables
- Secrets: Never committed to repository

## Scalability Considerations

### Database Scalability

- Connection pooling via Supabase PgBouncer
- Indexes on frequently queried fields
- Efficient queries with Prisma includes

### Caching Scalability

- Redis for high-performance caching
- Event listings cached to reduce database load
- Cache invalidation strategy needed

### Session Scalability

- Redis for distributed session storage
- In-memory fallback for single-server development
- Session cleanup via TTL

### Reservation Scalability

- Atomic Redis operations prevent race conditions
- Lua scripts for atomicity
- Reservation expiry prevents resource locking

## Deployment Architecture

### Production Considerations

**Frontend:**
- Next.js standalone output for Docker
- Static asset optimization
- Image optimization via Next.js Image component

**Backend:**
- Fastify with production logging
- Graceful shutdown handlers
- Health check endpoint

**Database:**
- Supabase connection pooling
- Direct connection for migrations
- Backup and recovery via Supabase

**Monitoring:**
- Health check endpoint: `/health`
- Logging via Fastify Pino logger
- Error tracking (needs implementation)

## Known Architecture Limitations

1. **Redis Dependency:** Critical for sessions and reservations. Mitigation: In-memory fallback for development.

2. **Single Server:** Current architecture assumes single server. For horizontal scaling, need:
   - Shared Redis for sessions
   - Load balancer with sticky sessions (or stateless design)
   - Database connection pooling

3. **Cache Invalidation:** Manual cache invalidation. Recommendation: Implement automatic invalidation on updates.

4. **File Storage:** S3 uploads synchronous. Recommendation: Consider async uploads with background processing.

5. **Email/SMS Queue:** No retry queue for failed sends. Recommendation: Implement background job processing.
