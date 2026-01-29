# Docker Setup (DEPRECATED)

> **⚠️ This setup has been deprecated in favor of Supabase + Upstash Redis**
> 
> We've migrated to cloud-managed services for a simpler development experience:
> - **Database**: Supabase PostgreSQL (see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md))
> - **Redis**: Upstash Redis (see [UPSTASH_SETUP.md](./UPSTASH_SETUP.md))
>
> **Benefits:**
> - ✅ No Docker required (saves 5-10GB disk space)
> - ✅ Cloud-managed services (no local setup)
> - ✅ Free tiers available
> - ✅ Production-ready from day one
>
> **If you still need Docker setup**, you can refer to the git history or create your own `docker-compose.yml` file.

## Migration Guide

If you were using Docker previously:

1. **Set up Supabase**: Follow [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
2. **Set up Upstash**: Follow [UPSTASH_SETUP.md](./UPSTASH_SETUP.md)
3. **Update environment variables**: Update `apps/api/.env` with new connection strings
4. **Run migrations**: `npx prisma migrate dev`

That's it! No Docker needed.

---

## Legacy Docker Information (For Reference Only)

The following information is kept for reference only. Docker files have been removed from the repository.

### Previous Docker Setup

The project previously used:
- `docker-compose.minimal.yml` - Minimal Docker Compose for PostgreSQL and Redis
- `apps/api/Dockerfile` - API Docker image
- `apps/web/Dockerfile` - Web Docker image
- `config/postgres/postgresql.conf` - PostgreSQL configuration
- `config/redis/redis.conf` - Redis configuration

All these files have been removed. If you need Docker setup, you'll need to create your own configuration.

### Why We Migrated

1. **Disk Space**: Docker Desktop uses 5-10GB of disk space
2. **Complexity**: Docker setup requires more configuration
3. **Performance**: Native services are faster for development
4. **Cost**: Supabase and Upstash free tiers are sufficient for development
5. **Simplicity**: Cloud services are easier to set up and maintain

### Alternative: Local PostgreSQL + Redis

If you prefer local services without Docker:

```bash
# Install PostgreSQL
brew install postgresql@15
brew services start postgresql@15

# Install Redis
brew install redis
brew services start redis

# Create database
psql postgres -c "CREATE DATABASE ticketing;"
```

Then update `apps/api/.env`:
```bash
DATABASE_URL="postgresql://$(whoami)@localhost:5432/ticketing"
REDIS_URL="redis://localhost:6379"
```

However, we recommend using Supabase + Upstash for the best experience.

---

For current setup instructions, see:
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Database setup
- [UPSTASH_SETUP.md](./UPSTASH_SETUP.md) - Redis setup
- [README.md](./README.md) - Quick start guide
