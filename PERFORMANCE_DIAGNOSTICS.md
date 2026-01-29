# Performance Diagnostics Guide

This guide helps you diagnose and fix slow data loading issues in your application.

## 🔍 Quick Diagnosis Steps

### 1. **Check Browser Network Tab**
Open DevTools (F12) → Network tab:
- Look for slow API calls (>1 second)
- Check response sizes
- Identify waterfall requests (sequential instead of parallel)

### 2. **Check Backend Logs**
The performance monitor automatically logs slow operations:
- Operations > 1000ms are logged with ⚠️
- Operations > 500ms are logged with ⏱️
- Check your server console for these warnings

### 3. **Run Database Index Analysis**
```bash
cd apps/api
tsx src/scripts/check-indexes.ts
```

This will:
- Show current indexes
- Suggest missing indexes
- Identify slow queries (if pg_stat_statements is enabled)
- Show table statistics

## 🛠️ Performance Monitoring

### Backend Monitoring

Performance monitoring is automatically enabled in development mode. To enable in production:

```bash
export PERF_MONITOR=true
```

The monitor tracks:
- Query execution times
- Parallel query performance
- Slow operation warnings

### Frontend Monitoring

The analytics page now includes performance logging:
- Check browser console for fetch timing
- Slow requests (>1s) are logged with warnings

## 📊 Common Performance Issues & Solutions

### Issue 1: Missing Database Indexes

**Symptoms:**
- Slow queries on filtered columns (category, city, status)
- Slow joins

**Solution:**
Run the index analysis script and create suggested indexes:

```sql
-- Example: Composite index for common filters
CREATE INDEX idx_events_category_status ON events(category, status, saleStart, saleEnd);
CREATE INDEX idx_events_city_status ON events(city, status);
```

### Issue 2: N+1 Query Problems

**Symptoms:**
- Multiple sequential queries instead of one
- Slow loading when relationships are involved

**Solution:**
Use Prisma's `include` or `select` to eager load relationships:

```typescript
// Good: Single query with includes
const events = await prisma.event.findMany({
  include: {
    ticketTypes: true,
    organizer: true,
  },
});

// Bad: Multiple queries
const events = await prisma.event.findMany();
for (const event of events) {
  const ticketTypes = await prisma.ticketType.findMany({ where: { eventId: event.id } });
}
```

### Issue 3: Fetching Too Much Data

**Symptoms:**
- Large response sizes
- Slow network transfer

**Solution:**
Use `select` to fetch only needed fields:

```typescript
// Good: Select only needed fields
const events = await prisma.event.findMany({
  select: {
    id: true,
    title: true,
    startDateTime: true,
    // ... only what you need
  },
});

// Bad: Fetching everything
const events = await prisma.event.findMany(); // Fetches all columns
```

### Issue 4: No Pagination

**Symptoms:**
- Loading all records at once
- Slow initial load

**Solution:**
Always use pagination:

```typescript
const events = await prisma.event.findMany({
  skip: (page - 1) * limit,
  take: limit,
});
```

### Issue 5: Inefficient Aggregations

**Symptoms:**
- Slow analytics queries
- Loading all records to count

**Solution:**
Use database aggregations:

```typescript
// Good: Database aggregation
const count = await prisma.order.count({
  where: { eventId, status: 'PAID' },
});

// Bad: Loading all records
const orders = await prisma.order.findMany({
  where: { eventId, status: 'PAID' },
});
const count = orders.length; // Inefficient!
```

## 🔧 Optimization Checklist

- [ ] Run `check-indexes.ts` and create missing indexes
- [ ] Check for N+1 queries (use `include`/`select`)
- [ ] Verify pagination is implemented
- [ ] Use `select` to limit fetched fields
- [ ] Use database aggregations instead of client-side calculations
- [ ] Enable Redis caching for frequently accessed data
- [ ] Check for missing composite indexes on filtered columns
- [ ] Monitor slow queries in production logs

## 📈 Monitoring Queries

### Check Query Performance in PostgreSQL

```sql
-- Enable query statistics (one-time setup)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slow queries
SELECT 
  LEFT(query, 100) as query,
  calls,
  mean_exec_time as avg_time_ms,
  max_exec_time as max_time_ms
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Explain a specific query
EXPLAIN ANALYZE
SELECT * FROM events 
WHERE category = 'music' 
  AND status = 'PUBLISHED'
  AND saleStart <= NOW()
  AND saleEnd >= NOW();
```

### Check Index Usage

```sql
-- See which indexes are being used
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

## 🚀 Quick Wins

1. **Add Composite Indexes** - Most impactful for filtered queries
   ```sql
   CREATE INDEX idx_events_status_dates ON events(status, saleStart, saleEnd);
   ```

2. **Enable Query Result Caching** - Already implemented with Redis
   - Events list: 5 minutes
   - Event details: 1 minute

3. **Use Parallel Queries** - Already implemented in analytics endpoint
   ```typescript
   const [event, revenue, tickets] = await Promise.all([...]);
   ```

4. **Limit Data Transfer** - Use `select` instead of `include` when possible

## 📝 Performance Logs

### Backend Logs
Look for these in your server console:
```
⏱️  query:event.findMany: 234.56ms { category: 'music', city: 'Lagos' }
⚠️  Slow operation detected: query:order.aggregate took 1234.56ms
```

### Frontend Logs
Check browser console:
```
✅ Analytics fetched in 456.78ms
⚠️ Slow analytics fetch: 1234.56ms
```

## 🔍 Debugging Specific Endpoints

### Analytics Endpoint (`/api/v1/organizer/events/:id/analytics`)

This endpoint uses parallel queries with aggregations. If slow:
1. Check if indexes exist on `orders.eventId`, `orders.status`
2. Check if indexes exist on `tickets.orderId`, `tickets.eventId`
3. Verify `ticketTypes` query is fast (should be indexed on `eventId`)

### Events List Endpoint (`/api/v1/events`)

This endpoint has caching. If slow:
1. Check Redis connection
2. Verify indexes on `status`, `saleStart`, `saleEnd`, `category`, `city`
3. Check if pagination is working (limit should be reasonable)

## 📚 Additional Resources

- [Prisma Performance Guide](https://www.prisma.io/docs/guides/performance-and-optimization)
- [PostgreSQL Indexing Best Practices](https://www.postgresql.org/docs/current/indexes.html)
- [Database Query Optimization](https://use-the-index-luke.com/)

## 🆘 Still Having Issues?

1. Run the index analysis script
2. Check server logs for slow operation warnings
3. Use `EXPLAIN ANALYZE` on slow queries
4. Check network tab for large response sizes
5. Verify Redis caching is working
