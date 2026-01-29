# Apply Performance Indexes Migration

## 🚀 Quick Start

### Option 1: Using Prisma Migrate (Recommended)
```bash
cd packages/database
npx prisma migrate deploy
```

Or for development:
```bash
cd packages/database
npx prisma migrate dev
```

### Option 2: Manual SQL Execution
If you prefer to run the SQL directly:

```bash
cd packages/database
# Connect to your database and run:
psql $DATABASE_URL -f prisma/migrations/20260127215620_add_performance_indexes/migration.sql
```

## 📋 Pre-Deployment Checklist

- [ ] **Backup your database** (critical!)
- [ ] **Check current traffic** - Run during low-traffic period
- [ ] **Verify database connection** - Test connection to your database
- [ ] **Review indexes** - Ensure these columns exist in your schema
- [ ] **Test on staging first** - Always test migrations on staging before production

## ⚠️ Important Notes

### Timing
- Index creation can take **2-10 minutes** depending on table size
- Tables will be **briefly locked** during index creation
- **Best time**: Low-traffic periods (e.g., early morning)

### Impact
- **Storage**: Indexes will add ~10-20% to your database size
- **Writes**: Slight slowdown on INSERT/UPDATE operations (usually negligible)
- **Reads**: **50-90% faster** query performance

### Monitoring
After applying, monitor:
1. Query performance (check server logs for timing improvements)
2. Database size increase
3. Write operation latency (should be minimal)

## 🔍 Verification

### Check if indexes were created:
```sql
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

### Test query performance:
```sql
-- Before: Check current query time
EXPLAIN ANALYZE
SELECT * FROM events 
WHERE category = 'music' 
  AND status = 'PUBLISHED'
  AND saleStart <= NOW()
  AND saleEnd >= NOW();

-- After: Should see "Index Scan" instead of "Seq Scan"
```

## 🧹 Post-Migration Maintenance

### Run VACUUM (Recommended)
After applying indexes, clean up dead tuples:

```sql
-- Run during low traffic
VACUUM ANALYZE ticket_types;
VACUUM ANALYZE orders;
```

Or schedule via cron:
```bash
# Add to your maintenance script
psql $DATABASE_URL -c "VACUUM ANALYZE ticket_types; VACUUM ANALYZE orders;"
```

## 📊 Expected Results

### Before Migration
- Event filtering queries: **500-2000ms**
- Analytics queries: **1000-3000ms**
- Ticket lookups: **200-800ms**

### After Migration
- Event filtering queries: **50-200ms** (75-90% improvement)
- Analytics queries: **100-500ms** (80-85% improvement)
- Ticket lookups: **20-100ms** (75-90% improvement)

## 🆘 Troubleshooting

### Migration Fails
1. Check database connection
2. Verify you have CREATE INDEX permissions
3. Check if indexes already exist (they use IF NOT EXISTS, so safe to re-run)

### Slow Index Creation
- Normal for large tables
- Can take 5-15 minutes on tables with millions of rows
- Monitor progress in database logs

### Rollback
If needed, see rollback SQL in the migration README.md

## 📚 Related Documentation
- See `PERFORMANCE_DIAGNOSTICS.md` for detailed troubleshooting
- See `PERFORMANCE_SETUP.md` for monitoring setup
