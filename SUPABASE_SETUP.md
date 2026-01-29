# Supabase Setup Guide

This guide will help you set up Supabase PostgreSQL for the getiickets platform.

## What is Supabase?

Supabase is an open-source Firebase alternative that provides:
- **PostgreSQL Database** (managed, auto-scaling)
- **Authentication** (optional, can use with your existing auth)
- **Storage** (for event images, ticket PDFs)
- **Realtime** (for live ticket availability updates)
- **Free Tier**: 500MB database, 50K monthly active users

## Step 1: Create Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"**
3. Sign up with GitHub, Google, or email
4. Verify your email if required

## Step 2: Create a New Project

1. Click **"New Project"** in your dashboard
2. Fill in project details:
   - **Name**: `getiickets` (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your users:
     - **Africa**: `ap-southeast-1` (Singapore) or `eu-west-1` (Ireland)
     - **US**: `us-east-1` (N. Virginia)
     - **Europe**: `eu-west-1` (Ireland)
3. Click **"Create new project"**
4. Wait 1-2 minutes for project setup

## Step 3: Get Connection Strings

1. In your Supabase project dashboard, go to **Settings** → **Database**
2. Scroll to **Connection string** section
3. You'll see two connection strings:

### Connection Pooling (for Prisma Client)
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

### Direct Connection (for Migrations)
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

**Important**: 
- Use the **pooling URL** for `DATABASE_URL` (Prisma Client)
- Use the **direct URL** for `DIRECT_URL` (Prisma Migrations)

## Step 4: Update Environment Variables

Edit `apps/api/.env`:

```bash
# Replace [PASSWORD] with your database password
# Replace [PROJECT-REF] with your project reference ID
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

### Finding Your Project Reference

1. Go to **Settings** → **General**
2. Look for **Reference ID** (e.g., `abcdefghijklmnop`)
3. Or check the connection string - it's in the URL

## Step 5: Run Prisma Migrations

```bash
# Navigate to database package
cd packages/database

# Generate Prisma Client
npx prisma generate

# Push schema to Supabase (creates all tables)
npx prisma db push

# Or create a migration
npx prisma migrate dev --name init
```

## Step 6: Verify Connection

```bash
# Test connection with Prisma Studio
npx prisma studio

# This opens a browser at http://localhost:5555
# You should see your database tables
```

## Step 7: (Optional) Set Up Supabase Auth

If you want to use Supabase Authentication:

1. Go to **Authentication** → **Settings**
2. Configure email providers
3. Add your frontend URL to **Site URL**
4. Get your API keys from **Settings** → **API**

Add to `apps/web/.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

## Step 8: (Optional) Set Up Supabase Storage

For storing event images and ticket PDFs:

1. Go to **Storage** → **Create bucket**
2. Create buckets:
   - `event-images` (for event banners)
   - `ticket-pdfs` (for ticket PDFs)
3. Set bucket policies (public read, authenticated write)

## Supabase Features You Can Use

### 1. Row Level Security (RLS)

Enable automatic security on your tables:

```sql
-- Enable RLS on events table
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see published events
CREATE POLICY "Public events are viewable by everyone"
ON "Event" FOR SELECT
USING (status = 'PUBLISHED');
```

### 2. Realtime Subscriptions

Get real-time updates for ticket availability:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Subscribe to ticket updates
const subscription = supabase
  .channel('ticket-updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'Ticket',
      filter: 'eventId=eq.EVENT_ID'
    },
    (payload) => {
      console.log('Ticket updated:', payload.new)
    }
  )
  .subscribe()
```

### 3. Database Functions

Create PostgreSQL functions for complex queries:

```sql
-- Example: Get available tickets count
CREATE OR REPLACE FUNCTION get_available_tickets(event_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) 
    FROM "Ticket" 
    WHERE "eventId" = event_id 
    AND status = 'AVAILABLE'
  );
END;
$$ LANGUAGE plpgsql;
```

## Free Tier Limits

- **Database Size**: 500MB
- **Bandwidth**: 5GB/month
- **API Requests**: Unlimited
- **Auth Users**: 50,000/month
- **Storage**: 1GB
- **Realtime**: 200 concurrent connections

## Production Considerations

### Connection Pooling

Supabase uses PgBouncer for connection pooling. Prisma automatically handles this with the `directUrl` configuration.

### Backups

Supabase automatically backs up your database:
- **Free tier**: Daily backups (7-day retention)
- **Pro tier**: Point-in-time recovery

### Monitoring

1. Go to **Database** → **Reports** to see:
   - Query performance
   - Database size
   - Connection count
   - Slow queries

### Scaling

When you outgrow the free tier:
- **Pro Plan**: $25/month
  - 8GB database
  - 250GB bandwidth
  - Daily backups with 7-day retention
  - Point-in-time recovery

## Troubleshooting

### Pooler unreachable (P1001 / "Can't reach database server")

If the API fails with `Can't reach database server` at `...pooler.supabase.com:6543`:

1. **Run the diagnostic:** `cd apps/api && npm run test-db-connection` — tests TCP reachability for direct and pooler.
2. **Check Network Bans** — Supabase can ban your IP after failed attempts. [Dashboard](https://supabase.com/dashboard) → your project → **Project Settings** → **Database** → **Network Bans**. Remove your IP if listed.
3. **Ensure `DIRECT_URL` is set** in `apps/api/.env` (direct, port 5432). The API tries the pooler first, then falls back to `DIRECT_URL`. We auto-add `connect_timeout=30` to DB URLs.
4. **Unpause the project** — Settings → General, if paused.
5. **Check network/firewall** — ensure you can reach `*.supabase.com` on 5432 and 6543. Try `psql "<DIRECT_URL>" -c "SELECT 1"`.
6. **Use direct only** — set `DATABASE_URL` to the same value as `DIRECT_URL` to skip the pooler.

### Connection Timeout

If you get connection timeouts:
1. Check your `DATABASE_URL` and `DIRECT_URL` format
2. Use the pooling URL (6543) for `DATABASE_URL` and direct URL (5432) for `DIRECT_URL` per the setup above
3. Check Supabase dashboard for service status

### Migration Errors

If migrations fail:
1. Use `DIRECT_URL` for migrations (not pooling URL)
2. Check Prisma schema compatibility
3. Review error messages in Supabase logs

### SSL Connection Required

Supabase requires SSL. Prisma handles this automatically, but if you see SSL errors:
```bash
# Add SSL mode to connection string
DATABASE_URL="postgresql://...?sslmode=require"
```

## Next Steps

1. ✅ Set up Supabase project
2. ✅ Update environment variables
3. ✅ Run Prisma migrations
4. ⬜ Set up Upstash Redis (see `UPSTASH_SETUP.md`)
5. ⬜ Configure Supabase Storage (optional)
6. ⬜ Set up Supabase Auth (optional)

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Prisma + Supabase Guide](https://supabase.com/docs/guides/integrations/prisma)
- [Supabase Discord](https://discord.supabase.com)
