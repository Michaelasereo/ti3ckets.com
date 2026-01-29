# getiickets - Ticketing Platform

A comprehensive ticketing platform for events across Africa, built with Next.js, Node.js, and cloud services.

## Architecture

- **Frontend**: Next.js 14 (TypeScript) deployed on Netlify
- **Backend**: Node.js 18+ with Fastify
- **Database**: Supabase PostgreSQL (managed, cloud)
- **Cache**: Upstash Redis (serverless, cloud)
- **Storage**: AWS S3 + CloudFront
- **Payments**: Paystack
- **Email**: Brevo (Sendinblue)
- **SMS**: Twilio

## Project Structure

```text
getiickets/
├── apps/
│   ├── web/          # Next.js 14 Frontend
│   └── api/           # Node.js Backend API
├── packages/
│   ├── shared/        # Shared TypeScript types
│   ├── database/      # Prisma client exports
│   └── config/        # Shared configs
└── scripts/           # Development scripts
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
   - Update `apps/api/.env` with your Supabase and Upstash credentials
   - Update `apps/web/.env.local` with your API URL and Paystack keys
   - See [ENV_VARIABLES.md](./ENV_VARIABLES.md) for all required variables

1. **Run database migrations**

   ```bash
   cd packages/database
   npx prisma generate
   npx prisma db push
   ```

   If you see **"Can't reach database server"** on port 5432, the app can still run using the **pooler** (port 6543). See [DATABASE_CONNECTION.md](./DATABASE_CONNECTION.md) for details.

### Development

**Start development servers:**

```bash
# Use the convenience script (recommended)
./scripts/start-dev.sh

# Or manually:
# Terminal 1: Start API
cd apps/api && npm run dev

# Terminal 2: Start Frontend
cd apps/web && npm run dev
```

If the page loads **without CSS** (unstyled content), start the frontend from the web app directory so Next.js finds PostCSS and Tailwind config: run `npm run dev:web` from the repo root, or `cd apps/web && npm run dev`. Then open http://localhost:3000.

### Dev Demo Mode (Organizer end-to-end without auth)

To demo the full organizer flow locally **without needing real login/session cookies**, enable demo mode flags and seed the demo organizer.

1. **Seed the demo organizer user**

```bash
cd apps/api
npm run seed
```

1. **Enable demo mode**

- `apps/api/.env`:
  - `DEMO_MODE=true`
  - (optional) `DEMO_USER_ID=demo-organizer-user`
  - (optional) `DEMO_USER_EMAIL=organizer.demo+4821@example.com`

- `apps/web/.env.local`:
  - `NEXT_PUBLIC_DEMO_MODE=true`
  - (optional) `NEXT_PUBLIC_DEMO_USER_ID=demo-organizer-user`
  - (optional) `NEXT_PUBLIC_DEMO_USER_EMAIL=organizer.demo+4821@example.com`
  - (optional) `NEXT_PUBLIC_DEMO_USER_NAME=Demo Organizer`

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

**Stop development servers:**

```bash
./scripts/stop-dev.sh
```

### Build

```bash
npm run build
```

### Deployment

For production deployment (including Next.js standalone output), see [DEPLOYMENT.md](./DEPLOYMENT.md). When using standalone, you must copy `.next/static` and `public` into the standalone folder so CSS and JS load correctly.

## Environment Variables

See [ENV_VARIABLES.md](./ENV_VARIABLES.md) for complete documentation of all required environment variables.

Quick reference:

- `apps/api/.env` - Backend configuration (Supabase, Upstash, Paystack, etc.)
- `apps/web/.env.local` - Frontend configuration (API URL, Paystack public key)

## Setup Guides

- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Database setup with Supabase
- [DATABASE_CONNECTION.md](./DATABASE_CONNECTION.md) - Pooler vs direct URL, avoiding "Can't reach database server"
- [UPSTASH_SETUP.md](./UPSTASH_SETUP.md) - Redis setup with Upstash
- [ENV_VARIABLES.md](./ENV_VARIABLES.md) - Complete environment variables reference
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment (standalone, static assets)
- [AWS_SETUP.md](./AWS_SETUP.md) - AWS S3 configuration
- [QUICK_AWS_SETUP.md](./QUICK_AWS_SETUP.md) - Quick AWS reference

## Scripts

- `npm run dev` - Start all apps via Turbo (from root)
- `npm run dev:web` - Start only the Next.js frontend (from root; use if page loads without CSS)
- `./scripts/start-dev.sh` - Start development servers
- `./scripts/stop-dev.sh` - Stop development servers
- `./scripts/setup-supabase.sh` - Interactive Supabase setup
- `./scripts/cleanup.sh` - Clean up temporary files

## License

Proprietary
