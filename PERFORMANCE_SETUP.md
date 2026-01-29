# Performance Monitoring Setup

## ✅ What Was Implemented

### 1. **Performance Monitoring Utility** (`apps/api/src/utils/performance.ts`)
- Automatic query timing and logging
- Tracks slow operations (>500ms logged, >1000ms warned)
- Supports parallel query monitoring
- Enabled automatically in development, or set `PERF_MONITOR=true` in production

### 2. **Backend Performance Logging**
- **Analytics Endpoint** (`/api/v1/organizer/events/:id/analytics`)
  - Now monitors all parallel queries
  - Logs timing for each query group
  
- **Events List Endpoint** (`/api/v1/events`)
  - Monitors event fetching and counting queries
  - Tracks filter parameters for context

### 3. **Frontend Performance Monitoring**
- **Analytics Page** (`apps/web/app/organizer/events/[id]/analytics/page.tsx`)
  - Logs fetch timing in browser console
  - Warns on slow requests (>1s)

### 4. **Database Index Analysis Script**
- **Script**: `apps/api/src/scripts/check-indexes.ts`
- Analyzes your database schema
- Suggests missing indexes based on query patterns
- Shows slow queries (if pg_stat_statements enabled)
- Displays table statistics

### 5. **Comprehensive Documentation**
- **PERFORMANCE_DIAGNOSTICS.md** - Complete troubleshooting guide
- Common issues and solutions
- Optimization checklist
- SQL queries for monitoring

## 🚀 How to Use

### Run Database Index Analysis

```bash
cd apps/api
npm run check-indexes
```

This will:
- Show current indexes
- Suggest missing indexes with SQL commands
- Identify slow queries
- Show table statistics

### Monitor Performance in Development

Performance monitoring is **automatically enabled** in development. Just check your server console:

```
⏱️  parallel:event+revenueData+ticketCount+orderCount+ticketTypes: 234.56ms
✅ Analytics fetched in 456.78ms
```

### Enable in Production

Set environment variable:
```bash
export PERF_MONITOR=true
```

### Check Frontend Performance

Open browser DevTools → Console when loading analytics:
```
✅ Analytics fetched in 456.78ms
⚠️ Slow analytics fetch: 1234.56ms
```

## 📊 What to Look For

### Backend Logs
- **⏱️** = Operation took 500-1000ms (normal, but monitor)
- **⚠️** = Operation took >1000ms (needs investigation)

### Frontend Console
- **✅** = Fast request (<1s)
- **⚠️** = Slow request (>1s)

### Database Analysis
- **🔴 HIGH** = Critical missing index
- **🟡 MEDIUM** = Recommended index
- **🟢 LOW** = Optional optimization

## 🔍 Next Steps

1. **Run the index analysis:**
   ```bash
   npm run check-indexes
   ```

2. **Create suggested indexes** (especially HIGH priority ones)

3. **Monitor your logs** during normal usage to identify bottlenecks

4. **Check PERFORMANCE_DIAGNOSTICS.md** for detailed troubleshooting

## 📝 Example Output

### Index Analysis
```
💡 Suggested Indexes:

🔴 HIGH: events
   Columns: category, status, saleStart, saleEnd
   Reason: Filtering by category and status with date ranges
   SQL: CREATE INDEX idx_events_category_status_saleStart_saleEnd ON events (category, status, saleStart, saleEnd);
```

### Performance Logs
```
⏱️  query:event.findFirst: 123.45ms { eventId: 'clx...', userId: 'cly...' }
⏱️  parallel:event+revenueData+ticketCount+orderCount+ticketTypes: 456.78ms
```

## 🎯 Quick Wins

1. Run `npm run check-indexes` and create HIGH priority indexes
2. Monitor logs during peak usage
3. Check browser Network tab for slow API calls
4. Use `EXPLAIN ANALYZE` on slow queries identified by the script

For detailed troubleshooting, see **PERFORMANCE_DIAGNOSTICS.md**.
