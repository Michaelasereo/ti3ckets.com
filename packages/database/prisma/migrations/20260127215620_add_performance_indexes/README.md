# Performance Indexes Migration

## Overview
This migration adds critical performance indexes identified by the database analysis script to fix slow data loading issues, especially for age/event filtering and analytics queries.

## Indexes Added

### High Priority (Critical for Performance)
1. **idx_events_category_status_saleStart_saleEnd** - Composite index for category/status/date filtering
2. **idx_events_city_status** - City + status filtering
3. **idx_events_startDateTime_status** - Date + status filtering
4. **idx_orders_eventId_status_createdAt** - Analytics queries
5. **idx_tickets_eventId_status** - Event ticket queries
6. **idx_seats_eventId_status_section** - Seat availability queries

### Medium Priority
7. **idx_events_organizerId_status** - Organizer dashboard queries
8. **idx_orders_userId_status** - User order history
9. **idx_tickets_orderId_status** - Order ticket lookups
10. **idx_ticket_types_eventId_price** - Price sorting

## Expected Impact
- **50-90% reduction** in query time for filtered event queries
- **Significant improvement** in analytics endpoint performance
- **Faster** ticket and seat availability queries

## Deployment Notes
- Index creation may take a few minutes on large tables
- Tables will be briefly locked during index creation
- Consider running during low-traffic periods
- Monitor database size increase (indexes add storage)

## Post-Deployment
After applying this migration, consider:
1. Running `VACUUM ANALYZE` on tables with high dead tuple ratios:
   ```sql
   VACUUM ANALYZE ticket_types;
   VACUUM ANALYZE orders;
   ```
2. Monitoring query performance improvements
3. Checking database size increase

## Rollback
To rollback this migration:
```sql
DROP INDEX IF EXISTS "idx_events_category_status_saleStart_saleEnd";
DROP INDEX IF EXISTS "idx_events_city_status";
DROP INDEX IF EXISTS "idx_events_startDateTime_status";
DROP INDEX IF EXISTS "idx_events_organizerId_status";
DROP INDEX IF EXISTS "idx_orders_eventId_status_createdAt";
DROP INDEX IF EXISTS "idx_orders_userId_status";
DROP INDEX IF EXISTS "idx_tickets_eventId_status";
DROP INDEX IF EXISTS "idx_tickets_orderId_status";
DROP INDEX IF EXISTS "idx_ticket_types_eventId_price";
DROP INDEX IF EXISTS "idx_seats_eventId_status_section";
```
