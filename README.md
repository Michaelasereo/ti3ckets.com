# getiickets - Ticketing Platform

A comprehensive ticketing platform for events across Africa, built with Next.js, Node.js, and cloud services.

## Architecture

- **App**: Next.js 14 (TypeScript) — frontend and API routes on a single server (port 3000)
- **Database**: Supabase PostgreSQL (managed, cloud); Prisma in `apps/web`
- **Cache**: Upstash Redis (serverless, cloud) for sessions; in-memory fallback in dev
- **Storage**: AWS S3 + CloudFront (when configured)
- **Payments**: Paystack
- **Email**: Brevo (Sendinblue)
- **SMS**: Twilio

The legacy Express API in `apps/api` (port 8080) is no longer used for standard development; all APIs run in Next.js.

## Project Structure

```text
getiickets/
├── apps/
│   ├── web/          # Next.js 14 (frontend + API routes, Prisma)
│   └── api/          # Legacy Express API (reference only)
├── packages/
│   ├── shared/       # Shared TypeScript types
│   ├── database/     # Prisma schema (used by api; web has its own copy)
│   └── config/       # Shared configs
└── scripts/          # Development scripts
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Supabase account (free tier available)
- Upstash account (free tier available)

### Installation

```bash
npm install
```

### Setup

1. **Set up Supabase (Database)**
   - Create a project at [supabase.com](https://supabase.com)
   - Get your connection strings
   - See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed instructions

1. **Set up Upstash Redis**
   - Create a database at [upstash.com](https://upstash.com)
   - Get your Redis connection URL
   - See [UPSTASH_SETUP.md](./UPSTASH_SETUP.md) for detailed instructions

1. **Configure environment variables**
   - Create `apps/web/.env.local` with `DATABASE_URL`, `DIRECT_URL`, `REDIS_URL`, `BREVO_API_KEY`, `JWT_SECRET`, `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`, etc.
   - See [ENV_VARIABLES.md](./ENV_VARIABLES.md) for all required variables
   - **Launch mode**: By default the homepage shows only the waitlist form (no nav links, no footer links). Set `NEXT_PUBLIC_LAUNCH_MODE=false` in `.env.local` to show the full site (events, auth, etc.).

1. **Run database migrations**

   ```bash
   cd apps/web
   npx prisma generate
   npx prisma db push
   ```

   If you see **"Can't reach database server"** on port 5432, the app can still run using the **pooler** (port 6543). See [DATABASE_CONNECTION.md](./DATABASE_CONNECTION.md) for details.

### Development

**Start the app (single server on port 3000):**

```bash
# Use the convenience script (recommended)
./scripts/start-dev.sh

# Or from root:
npm run dev

# Or from web app:
cd apps/web && npm run dev
```

Open **http://localhost:3000**. All API routes are served by Next.js on the same port; no separate API server is required.

### Dev Demo Mode (Organizer end-to-end without auth)

To demo the full organizer flow locally **without needing real login/session cookies**, enable demo mode flags and seed the demo organizer.

1. **Seed the demo organizer user** (if you have a seed script in apps/web or packages/database)

```bash
cd apps/web && npx prisma db seed
# or from packages/database if seed exists there
```

1. **Enable demo mode**

- `apps/web/.env.local`:
  - `DEMO_MODE=true` (if supported)
  - `NEXT_PUBLIC_DEMO_MODE=true`
  - (optional) `NEXT_PUBLIC_DEMO_USER_ID`, `NEXT_PUBLIC_DEMO_USER_EMAIL`, `NEXT_PUBLIC_DEMO_USER_NAME`

1. **Demo credentials (if you want to log in normally)**

- Email: `organizer.demo+4821@example.com`
- Password: `DemoOrg#4821`

1. **Manual smoke test**

- Visit `/organizer/dashboard` (should load without redirect in demo mode)
- Visit `/onboarding/organizer` and save profile details
- Create an event at `/organizer/events/create`
- View it on `/events/[slug]` and proceed through checkout
- Verify the order appears in:
  - Buyer: `/dashboard/orders`
  - Organizer: `/organizer/events/[id]/orders`
- **Waitlist**: Buyers can join via `POST /api/v1/waitlist` (e.g. when event is sold out). Organizer views entries and exports CSV from the event **Waitlist** tab.

**Login not working?**

- Login and all API routes run in Next.js on port 3000. Ensure `apps/web` is running (`npm run dev` or `./scripts/start-dev.sh`).
- For "Invalid email or password", use an account you registered at `/auth/register`, or use the demo credentials above if you ran the seed and set demo mode.
- Health check: `GET http://localhost:3000/api/health` returns database status.

### Build

```bash
npm run build
```

### Deployment

For production deployment (including Next.js standalone output), see [DEPLOYMENT.md](./DEPLOYMENT.md). When using standalone, you must copy `.next/static` and `public` into the standalone folder so CSS and JS load correctly.

## Environment Variables

See [ENV_VARIABLES.md](./ENV_VARIABLES.md) for complete documentation of all required environment variables.

Quick reference:

- `apps/web/.env.local` - All configuration: `DATABASE_URL`, `DIRECT_URL`, `REDIS_URL`, `BREVO_API_KEY`, `JWT_SECRET`, `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`, etc. No separate API server; everything runs on port 3000.

## Setup Guides

- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Database setup with Supabase
- [DATABASE_CONNECTION.md](./DATABASE_CONNECTION.md) - Pooler vs direct URL, avoiding "Can't reach database server"
- [UPSTASH_SETUP.md](./UPSTASH_SETUP.md) - Redis setup with Upstash
- [ENV_VARIABLES.md](./ENV_VARIABLES.md) - Complete environment variables reference
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment (standalone, static assets)
- [AWS_SETUP.md](./AWS_SETUP.md) - AWS S3 configuration
- [QUICK_AWS_SETUP.md](./QUICK_AWS_SETUP.md) - Quick AWS reference

## Scripts

- `npm run dev` - Start Next.js app only (Turbo filter: web) — single server on port 3000
- `npm run dev:web` - Start Next.js from root
- `./scripts/start-dev.sh` - Generate Prisma client and start Next.js (port 3000)
- `./scripts/setup-supabase.sh` - Interactive Supabase setup
- `./scripts/cleanup.sh` - Clean up temporary files

## License

Proprietary
