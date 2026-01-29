# PRD 08: Gaps and Risks

## Known Unknowns

### KU-001: Ticket PDF Generation Integration

**Status:** ⚠️ PARTIAL
**Evidence:** 
- PDF service exists (`apps/api/src/services/pdf.ts`)
- PDF generation called in `TicketService.generateTicketsForOrder()`
- PDFs uploaded to S3

**Unknowns:**
- Is PDF generation fully working?
- Are PDFs actually being attached to emails?
- Is QR code image embedded in PDF?
- Can users download PDFs from UI?

**Recommendation:** Test end-to-end PDF generation and download flow

### KU-002: Check-in Interface Functionality

**Status:** ⚠️ PARTIAL
**Evidence:**
- Page exists: `apps/web/app/organizer/events/[id]/check-in/page.tsx`
- Ticket model has `checkedInAt` and `checkedInBy` fields

**Unknowns:**
- Is QR code scanning implemented?
- Is manual check-in implemented?
- Are check-in statistics displayed?
- Is there an API endpoint for check-in?

**Recommendation:** Review check-in page implementation and add missing API endpoints if needed

### KU-003: Waitlist Notification System

**Status:** ❌ MISSING
**Evidence:**
- Waitlist entries can be created
- `notified` and `notifiedAt` fields exist
- No notification logic found

**Unknowns:**
- How should waitlist members be notified?
- When should notifications be sent?
- What triggers notification (tickets become available)?

**Recommendation:** Implement waitlist notification system

### KU-004: Refund Processing

**Status:** ❌ MISSING
**Evidence:**
- OrderStatus enum includes REFUNDED
- No refund API endpoints found
- No refund UI found

**Unknowns:**
- Should refunds go through Paystack?
- What's the refund policy?
- Who can initiate refunds (organizer, admin)?
- Partial refunds supported?

**Recommendation:** Design and implement refund system

### KU-005: Account Lockout Implementation

**Status:** ⚠️ PARTIAL
**Evidence:**
- `failedLoginAttempts` field exists
- `accountLockedUntil` field exists
- Login increments failed attempts
- No lockout logic found

**Unknowns:**
- What's the lockout threshold?
- How long should accounts be locked?
- Is lockout automatically released?

**Recommendation:** Implement account lockout logic

## Missing Features

### MF-001: Event Status Management UI

**Status:** ❌ MISSING
**API Status:** ✅ Implemented
**UI Status:** ❌ Missing

**Description:** Organizers need UI controls to change event status (publish, cancel, etc.)

**Impact:** High - Organizers cannot publish events without direct API calls

**Recommendation:** Add status toggle buttons to event management page

### MF-002: Waitlist Management UI

**Status:** ❌ MISSING
**API Status:** ⚠️ PARTIAL (entries can be created, viewing may exist)
**UI Status:** ❌ Missing

**Description:** Organizers need to view and manage waitlist entries

**Impact:** Medium - Organizers cannot see who's on waitlist

**Recommendation:** Implement waitlist management page with notification functionality

### MF-003: Order Management UI (Organizer)

**Status:** ⚠️ PARTIAL
**Evidence:** Page exists (`apps/web/app/organizer/events/[id]/orders/page.tsx`)
**API Status:** Unknown

**Description:** Organizers need to view all orders for their events

**Impact:** High - Critical for event management

**Recommendation:** Verify API endpoint exists, complete UI implementation

### MF-004: Check-in Interface

**Status:** ⚠️ PARTIAL
**Evidence:** Page exists (`apps/web/app/organizer/events/[id]/check-in/page.tsx`)
**API Status:** Unknown

**Description:** QR code scanner and manual check-in interface

**Impact:** High - Required for event day operations

**Recommendation:** Implement QR code scanning and check-in API endpoints

### MF-005: Ticket PDF Download

**Status:** ⚠️ PARTIAL
**Evidence:** PDF generation exists, download endpoint missing

**Description:** Users should be able to download ticket PDFs

**Impact:** Medium - Users may need to re-download tickets

**Recommendation:** Add download endpoint and UI button

### MF-006: Order History UI

**Status:** ⚠️ PARTIAL
**Evidence:** Page exists (`apps/web/app/dashboard/orders/page.tsx`)
**API Status:** ✅ Implemented

**Description:** Buyers need to view their order history

**Impact:** Medium - Important for user experience

**Recommendation:** Verify UI is fully functional

### MF-007: Ticket Transfer UI Integration

**Status:** ⚠️ PARTIAL
**Evidence:** 
- API exists: `POST /api/v1/tickets/:id/transfer`
- Component exists: `TransferTicketModal.tsx`

**Description:** UI component may not be integrated into ticket viewing page

**Impact:** Low - Feature exists but may not be accessible

**Recommendation:** Verify modal is integrated and accessible

### MF-008: Event Analytics UI

**Status:** ⚠️ PARTIAL
**Evidence:** 
- API exists: `GET /api/v1/organizer/events/:id/analytics`
- Page exists: `apps/web/app/organizer/events/[id]/analytics/page.tsx`

**Description:** Analytics visualization may be incomplete

**Impact:** Medium - Important for organizers

**Recommendation:** Review and complete analytics UI

### MF-009: Seat Management UI

**Status:** ⚠️ PARTIAL
**Evidence:**
- APIs exist: GET/POST/PUT/DELETE `/api/v1/organizer/events/:id/seats`
- Page exists: `apps/web/app/organizer/events/[id]/seats/page.tsx`

**Description:** Seat creation and management interface

**Impact:** Medium - Required for seated events

**Recommendation:** Verify UI is fully functional

### MF-010: Refund Processing

**Status:** ❌ MISSING
**Description:** Complete refund system (API + UI)

**Impact:** High - Required for customer support

**Recommendation:** Implement refund API and UI

## Partial Implementations

### PI-001: User Tickets Viewing

**Status:** ✅ Actually fully implemented
**Evidence:**
- API: `GET /api/v1/users/tickets` ✅
- UI: `apps/web/app/dashboard/tickets/page.tsx` ✅

**Note:** Previously marked as partial, but appears fully implemented

### PI-002: Event Editing

**Status:** ✅ Actually fully implemented
**Evidence:**
- API: `PUT /api/v1/organizer/events/:id` ✅
- UI: `apps/web/app/organizer/events/[id]/page.tsx` ✅

**Note:** Implementation complete, may need testing

### PI-003: Event Analytics

**Status:** ⚠️ PARTIAL
**Evidence:**
- API: ✅ Implemented
- UI: ⚠️ May be incomplete

**Recommendation:** Review analytics page and complete if needed

### PI-004: Ticket Transfer

**Status:** ⚠️ PARTIAL
**Evidence:**
- API: ✅ Implemented
- UI Component: ✅ Exists
- Integration: ❓ Unknown

**Recommendation:** Verify modal is accessible from ticket viewing page

## Risk Register

### High Risk Items

#### R-001: Redis Dependency for Sessions

**Risk:** Application cannot function without Redis for sessions
**Impact:** High - Users cannot log in
**Probability:** Medium (Redis can be unavailable)
**Mitigation:** ✅ In-memory fallback for development
**Status:** Partially mitigated

**Recommendation:**
- Add production fallback mechanism
- Consider database-backed sessions as fallback
- Implement session migration strategy

#### R-002: Paystack Payment Failures

**Risk:** Payment processing failures block ticket sales
**Impact:** High - Revenue loss
**Probability:** Low (Paystack is reliable)
**Mitigation:** ⚠️ Basic error handling
**Status:** Needs improvement

**Recommendation:**
- Add retry logic for transient failures
- Implement payment status polling
- Add manual payment verification endpoint

#### R-003: Database Connection Pool Exhaustion

**Risk:** Too many connections cause application failures
**Impact:** High - Application unavailable
**Probability:** Medium (under high load)
**Mitigation:** ✅ Connection pooling configured
**Status:** Mitigated but needs monitoring

**Recommendation:**
- Monitor connection pool usage
- Implement connection pool metrics
- Add connection pool alerts

#### R-004: Prepared Statement Errors

**Risk:** "Prepared statement already exists" errors
**Impact:** High - Database queries fail
**Probability:** Medium (with Supabase pooler)
**Mitigation:** ✅ `pgbouncer=true` flag set
**Status:** Mitigated

**Recommendation:**
- Monitor for recurrence
- Consider alternative connection strategies if issues persist

### Medium Risk Items

#### R-005: Concurrent Ticket Reservations

**Risk:** Race conditions in ticket reservation
**Impact:** Medium - Overselling possible
**Probability:** Low (atomic operations implemented)
**Mitigation:** ✅ Redis Lua scripts for atomicity
**Status:** Mitigated

**Recommendation:**
- Load test reservation system
- Monitor for overselling incidents

#### R-006: Email/SMS Delivery Failures

**Risk:** Notifications not delivered
**Impact:** Medium - Poor user experience
**Probability:** Medium (external service dependencies)
**Mitigation:** ⚠️ Graceful degradation (continues without sending)
**Status:** Partially mitigated

**Recommendation:**
- Implement retry queue
- Add delivery status tracking
- Consider alternative notification channels

#### R-007: S3 Upload Failures

**Risk:** QR codes and PDFs not stored
**Impact:** Medium - Tickets cannot be generated
**Probability:** Low (AWS S3 is reliable)
**Mitigation:** ⚠️ Basic error handling
**Status:** Needs improvement

**Recommendation:**
- Add retry logic
- Implement upload queue
- Add fallback storage option

#### R-008: Session Expiry During Checkout

**Risk:** User session expires while completing purchase
**Impact:** Medium - User must restart checkout
**Probability:** Medium (long checkout process)
**Mitigation:** ⚠️ Guest checkout supported
**Status:** Partially mitigated

**Recommendation:**
- Extend session on checkout page activity
- Implement session refresh mechanism
- Add session expiry warnings

### Low Risk Items

#### R-009: Cache Invalidation

**Risk:** Stale data shown to users
**Impact:** Low - Minor UX issue
**Probability:** Medium (manual invalidation)
**Mitigation:** ⚠️ Short TTLs (1-5 minutes)
**Status:** Partially mitigated

**Recommendation:**
- Implement automatic cache invalidation on updates
- Add cache versioning
- Consider cache tags

#### R-010: Promo Code Usage Tracking

**Risk:** Usage counts incorrect if order fails
**Impact:** Low - Minor data inconsistency
**Probability:** Low
**Mitigation:** ❌ Not implemented
**Status:** Risk exists

**Recommendation:**
- Only increment usage on successful payment
- Add usage rollback on order cancellation

## Fragile Code Areas

### FC-001: Ticket Generation Logic

**Location:** `apps/api/src/services/ticket.ts`

**Issues:**
- Generates only one ticket per order (comment says "one ticket per order item")
- May not handle multiple tickets correctly
- Seat assignment logic unclear

**Recommendation:** Review and fix ticket generation for multiple quantities

### FC-002: Promo Code Application

**Location:** `apps/api/src/routes/orders.ts`

**Issues:**
- Promo code applied but usage not incremented
- No validation that promo code was actually used

**Recommendation:** Increment usage count on successful payment only

### FC-003: Seat Reservation

**Location:** `apps/api/src/routes/tickets.ts`

**Issues:**
- Seat IDs passed but not validated against event
- No atomic operation for seat selection
- Race condition possible if two users select same seat

**Recommendation:** Add Redis-based atomic seat reservation

### FC-004: Event Status Transitions

**Location:** `apps/api/src/routes/organizer.ts`

**Issues:**
- Status transition validation exists but may need more rules
- No validation for business logic (e.g., cannot cancel event with paid orders)

**Recommendation:** Add business rule validation for status changes

### FC-005: Free Ticket Handling

**Location:** `apps/api/src/routes/payments.ts`, `apps/api/src/routes/orders.ts`

**Issues:**
- Free tickets handled in multiple places
- May have inconsistencies

**Recommendation:** Centralize free ticket logic

## Missing Validation

### MV-001: Ticket Type Deletion

**Location:** `apps/api/src/routes/organizer.ts`

**Issue:** No explicit validation preventing deletion of ticket types with sold tickets
**Current:** Prisma cascade may prevent, but no user-friendly error
**Recommendation:** Add explicit validation with clear error message

### MV-002: Event Deletion

**Location:** N/A (no delete endpoint)

**Issue:** No event deletion endpoint exists
**Recommendation:** Add soft delete or prevent deletion if orders exist

### MV-003: Ticket Transfer Timing

**Location:** `apps/api/src/routes/tickets/transfer.ts`

**Issue:** No validation for event timing (can transfer after event started?)
**Recommendation:** Add event date validation

### MV-004: Promo Code Usage Per User

**Location:** `apps/api/src/routes/promo-codes.ts`

**Issue:** `maxUsesPerUser` validated but not tracked per user
**Recommendation:** Track promo code usage per user/email

### MV-005: Seat Selection Validation

**Location:** `apps/api/src/routes/tickets.ts`

**Issue:** Seat IDs validated but not atomically reserved
**Recommendation:** Add atomic seat reservation similar to ticket reservation

## Assumptions Made by Code

### A-001: All Users Start with BUYER Role

**Assumption:** Registration always creates BUYER role
**Evidence:** `apps/api/src/routes/auth.ts` (POST /register)
**Status:** ✅ Implemented

### A-002: Organizer Role is Self-Service

**Assumption:** Users can request ORGANIZER role without approval
**Evidence:** `apps/api/src/routes/auth.ts` (POST /request-organizer)
**Status:** ✅ Implemented

**Consideration:** May need approval process in production

### A-003: Guest Checkout Supported

**Assumption:** Users can purchase tickets without account
**Evidence:** Order creation allows null userId
**Status:** ✅ Implemented

### A-004: Free Tickets Auto-Paid

**Assumption:** Tickets with price = 0 are automatically marked as PAID
**Evidence:** `apps/api/src/routes/orders.ts`, `apps/api/src/routes/payments.ts`
**Status:** ✅ Implemented

### A-005: Session TTL Based on Role

**Assumption:** Organizers have shorter sessions (2 hours) than buyers (8 hours)
**Evidence:** `apps/api/src/routes/auth.ts` (login endpoint)
**Status:** ✅ Implemented

### A-006: Redis is Available

**Assumption:** Redis is available for sessions and caching
**Evidence:** Used throughout application
**Status:** ⚠️ Partially mitigated (in-memory fallback for dev)

**Consideration:** Production requires Redis

### A-007: Email/SMS are Optional

**Assumption:** Application continues if email/SMS fail
**Evidence:** Services log warnings and continue
**Status:** ✅ Implemented

### A-008: S3 is Available

**Assumption:** S3 is available for file uploads
**Evidence:** No fallback mechanism
**Status:** ❌ No mitigation

**Consideration:** Add fallback or error handling

### A-009: Paystack Webhooks are Reliable

**Assumption:** Paystack webhooks always arrive
**Evidence:** No retry mechanism
**Status:** ⚠️ Needs improvement

**Recommendation:** Implement webhook retry queue

### A-010: Event Status Transitions are Valid

**Assumption:** Status transitions follow business rules
**Evidence:** Validation exists but may need enhancement
**Status:** ⚠️ Partially implemented

**Recommendation:** Add more business rule validation

## Technical Debt

### TD-001: JWT Fallback Still Present

**Location:** `apps/api/src/middleware/auth.ts`

**Issue:** JWT authentication code still exists but not actively used
**Impact:** Low - Code maintenance burden
**Recommendation:** Remove JWT code if not needed, or document why it's kept

### TD-002: Next.js API Routes as Fallback

**Location:** `apps/web/app/api/v1/**/route.ts`

**Issue:** Next.js API routes exist but are bypassed by rewrites in development
**Impact:** Low - Code duplication
**Recommendation:** Remove or document purpose

### TD-003: Inconsistent Error Handling

**Location:** Various route files

**Issue:** Some routes have comprehensive error handling, others don't
**Impact:** Medium - Inconsistent user experience
**Recommendation:** Standardize error handling patterns

### TD-004: Cache Invalidation

**Location:** Event routes

**Issue:** Cache invalidation is manual, may lead to stale data
**Impact:** Medium - Users may see outdated information
**Recommendation:** Implement automatic cache invalidation

### TD-005: PDF QR Code Embedding

**Location:** `apps/api/src/services/pdf.ts`

**Issue:** PDF generation has QR code placeholder, actual embedding unclear
**Impact:** Low - PDFs may not have functional QR codes
**Recommendation:** Verify and implement QR code image embedding

## Security Considerations

### SC-001: Session Security

**Status:** ✅ Well implemented
- HTTP-only cookies
- Secure flag in production
- SameSite: strict
- Cryptographically secure session IDs

### SC-002: Password Security

**Status:** ✅ Well implemented
- bcrypt hashing (10 rounds)
- Minimum 8 characters
- Failed login attempt tracking

### SC-003: API Security

**Status:** ⚠️ Needs improvement
- Rate limiting implemented
- CORS configured
- Helmet security headers
- Missing: API key authentication for webhooks (only signature verification)

### SC-004: File Upload Security

**Status:** ⚠️ Needs improvement
- Files set to public-read
- No file type validation
- No file size limits
- No virus scanning

**Recommendation:**
- Implement file type validation
- Add file size limits
- Consider virus scanning
- Use CloudFront signed URLs

### SC-005: Input Validation

**Status:** ✅ Well implemented
- Zod schemas on all endpoints
- Database constraints
- Type validation

## Performance Considerations

### PC-001: Database Query Optimization

**Status:** ✅ Good
- Indexes on frequently queried fields
- Efficient Prisma queries
- Connection pooling

### PC-002: Caching Strategy

**Status:** ⚠️ Needs improvement
- Event listings cached (5 min)
- Event details cached (1 min)
- Manual invalidation
- No cache warming

**Recommendation:**
- Implement automatic cache invalidation
- Add cache warming on startup
- Consider longer TTLs with invalidation

### PC-003: Redis Performance

**Status:** ✅ Good
- Atomic operations for reservations
- Timeout protection
- Connection pooling

### PC-004: File Upload Performance

**Status:** ⚠️ Needs improvement
- Synchronous uploads
- No progress tracking
- No retry logic

**Recommendation:**
- Consider async uploads
- Add upload progress
- Implement retry logic

## Monitoring and Observability Gaps

### MO-001: Application Metrics

**Missing:**
- Request rate
- Response times
- Error rates
- Database query performance

**Recommendation:** Implement application metrics collection

### MO-002: Integration Health

**Missing:**
- Paystack API health
- Brevo API health
- Twilio API health
- S3 upload success rate

**Recommendation:** Add integration health checks

### MO-003: Business Metrics

**Missing:**
- Ticket sales rate
- Conversion rates
- Average order value
- Refund rate

**Recommendation:** Implement business metrics dashboard

## Recommendations Summary

### High Priority

1. Implement event status management UI
2. Complete check-in interface with QR scanning
3. Implement refund processing system
4. Add account lockout logic
5. Fix ticket generation for multiple quantities

### Medium Priority

6. Implement waitlist notification system
7. Add automatic cache invalidation
8. Implement retry logic for external services
9. Add file upload validation and security
10. Complete analytics UI

### Low Priority

11. Remove JWT fallback code (if not needed)
12. Standardize error handling
13. Add application metrics
14. Implement business metrics dashboard
15. Add PDF QR code embedding verification
