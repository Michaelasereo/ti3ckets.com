# Database Connection (Supabase)

This doc helps you avoid the **"Can't reach database server"** / **connection pool timeout** errors when using Supabase with getiickets.

## Two URLs: Pooler vs Direct

Supabase gives you two connection URLs:

| URL | Port | Used for | Often reachable? |
|-----|------|----------|------------------|
| **Pooler** (Transaction / Session) | **6543** | App runtime (API, Prisma Client) | ✅ Yes (e.g. `aws-0-xx.pooler.supabase.com:6543`) |
| **Direct** | **5432** | Migrations, `prisma migrate`, `prisma db execute` | ❌ Sometimes no (firewall, VPN, Supabase network bans) |

- **`DATABASE_URL`** in your `.env` should point at the **pooler** (port 6543) for the API.
- **`DIRECT_URL`** points at the direct host (port 5432) and is used by Prisma for migrations.

If the **direct** host is unreachable from your machine, you will see:

```text
Can't reach database server at `db.xxxx.supabase.co:5432`
```

The **app can still work** as long as the **pooler** is reachable and `DATABASE_URL` uses it.

## Quick check

From repo root:

```bash
cd apps/api
npx tsx src/scripts/test-db-connection.ts
```

You might see:

- **Direct (db.xxx:5432)** – ❌ unreachable  
- **Pooler (xxx.pooler.supabase.com:6543)** – ✅ reachable  

That’s normal on many networks. Use the pooler for the app.

## What works with the pooler only

- Running the API (`npm run dev` in `apps/api`)
- All app queries (Prisma uses `DATABASE_URL` = pooler)
- Seeding: `npm run seed` (in `apps/api`)

## What needs the direct connection

- `npx prisma migrate dev`
- `npx prisma db execute`
- `npx prisma db push` (sometimes uses direct)

If direct is unreachable:

1. **Run migrations from somewhere that can reach Supabase direct**  
   e.g. different network, CI, or Supabase SQL Editor (run the migration SQL by hand).
2. **Check Supabase → Project Settings → Database**  
   - **Network Bans**: unban your IP if it’s listed.  
   - **Connection string**: use “Connection pooling” (Transaction mode) for `DATABASE_URL`.
3. **Optional**: add `?connect_timeout=30` to both URLs for a longer timeout.

## Verify app connection (pooler)

```bash
cd apps/api
node -e "
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
prisma.\$connect().then(() => prisma.\$queryRaw\`SELECT 1\`).then(r => {
  console.log('DB OK:', r);
  return prisma.\$disconnect();
}).catch(e => { console.error(e); process.exit(1); });
"
```

If this prints `DB OK: [ { '1': 1 } ]`, the pooler is working and the API can use the database.

## Summary

- **Error “Can't reach database server” on port 5432** → Direct URL unreachable; use **pooler** for the app (`DATABASE_URL` = pooler URL, port 6543).
- **App and seed** → Use pooler; they work as long as `DATABASE_URL` is the pooler.
- **Migrations** → Need direct URL reachable, or run them from Supabase dashboard / another environment.

See also: [ENV_VARIABLES.md](./ENV_VARIABLES.md) (Database section), [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).

## Manual migration: organizer avatar

If **avatar upload** fails (e.g. 500 error or “Unknown arg avatarUrl”), the `organizer_profiles.avatarUrl` column may be missing. When the direct DB URL is unreachable, run this in **Supabase → SQL Editor**:

```sql
ALTER TABLE "organizer_profiles" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
```

Then try uploading your avatar again.
