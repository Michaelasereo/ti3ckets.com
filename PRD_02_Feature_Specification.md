# PRD 02: Feature Specification

## User Stories

### Buyer User Stories

#### ✅ IMPLEMENTED

**US-B-001: Browse Events**
- **Role:** Buyer (authenticated or guest)
- **Action:** View list of published events with filters
- **Evidence:** `apps/web/app/events/page.tsx`, `apps/api/src/routes/events.ts` (GET /api/v1/events)
- **Status:** Fully implemented
- **Features:**
  - Filter by category, city, date
  - Pagination support
  - Redis caching (5 min TTL)
  - Shows only PUBLISHED/LIVE events with active sale periods

**US-B-002: Search Events**
- **Role:** Buyer (authenticated or guest)
- **Action:** Search events by title, description, venue, or city
- **Evidence:** `apps/api/src/routes/events.ts` (GET /api/v1/events/search)
- **Status:** Fully implemented
- **Features:**
  - Case-insensitive search
  - Searches across title, description, venueName, city
  - Returns up to 20 results

**US-B-003: View Event Details**
- **Role:** Buyer (authenticated or guest)
- **Action:** View complete event information including description, ticket types, seats
- **Evidence:** `apps/web/app/events/[slug]/page.tsx`, `apps/api/src/routes/events.ts` (GET /api/v1/events/slug/:slug)
- **Status:** Fully implemented
- **Features:**
  - Event details with full description
  - Ticket types with pricing
  - Seat map for seated events (up to 2000 seats)
  - Redis caching (1 min TTL)

**US-B-004: Select Tickets**
- **Role:** Buyer (authenticated or guest)
- **Action:** Select ticket types and quantities
- **Evidence:** `apps/web/components/tickets/TicketSelector.tsx`
- **Status:** Fully implemented
- **Features:**
  - Quantity selection with min/max per order validation
  - Real-time availability checking
  - Availability warnings (low stock alerts)
  - Seat selection for seated events

**US-B-005: Reserve Tickets**
- **Role:** Buyer (authenticated or guest)
- **Action:** Reserve tickets temporarily before checkout
- **Evidence:** `apps/api/src/routes/tickets.ts` (POST /api/v1/tickets/reserve)
- **Status:** Fully implemented
- **Features:**
  - Atomic reservation using Redis Lua scripts
  - 10-minute reservation expiry (configurable)
  - Prevents overselling
  - Seat-specific reservations for seated events

**US-B-006: Purchase Tickets (Checkout)**
- **Role:** Buyer (authenticated or guest)
- **Action:** Complete ticket purchase with payment
- **Evidence:** `apps/web/app/checkout/page.tsx`, `apps/api/src/routes/orders.ts`, `apps/api/src/routes/payments.ts`
- **Status:** Fully implemented
- **Features:**
  - Guest checkout support
  - Paystack payment integration
  - Promo code application
  - Order creation
  - Automatic ticket generation on payment success

**US-B-007: Apply Promo Codes**
- **Role:** Buyer (authenticated or guest)
- **Action:** Apply discount codes during checkout
- **Evidence:** `apps/api/src/routes/promo-codes.ts` (POST /api/v1/promo-codes/validate)
- **Status:** Fully implemented
- **Features:**
  - Code validation (active status, validity dates, usage limits)
  - Percentage and fixed amount discounts
  - Event-specific and global codes
  - Minimum order amount validation
  - Maximum uses per user validation

**US-B-008: Join Waitlist**
- **Role:** Buyer (authenticated or guest)
- **Action:** Join waitlist for sold-out events
- **Evidence:** `apps/api/src/routes/waitlist.ts` (POST /api/v1/waitlist)
- **Status:** Fully implemented
- **Features:**
  - Email and phone collection
  - Ticket type-specific waitlist
  - Quantity preference
  - Duplicate prevention

**US-B-009: Register Account**
- **Role:** Guest
- **Action:** Create user account
- **Evidence:** `apps/web/app/auth/register/page.tsx`, `apps/api/src/routes/auth.ts` (POST /api/v1/auth/register)
- **Status:** Fully implemented
- **Features:**
  - Email and password registration
  - Automatic BUYER role assignment
  - BuyerProfile creation
  - Session creation on registration
  - Redirect to buyer onboarding

**US-B-010: Login**
- **Role:** User (buyer or organizer)
- **Action:** Authenticate and access account
- **Evidence:** `apps/web/app/auth/login/page.tsx`, `apps/api/src/routes/auth.ts` (POST /api/v1/auth/login)
- **Status:** Fully implemented
- **Features:**
  - Email/password authentication
  - Role-based redirects
  - Role selection for dual-role users
  - Failed login attempt tracking
  - Account lockout support (accountLockedUntil field exists)

**US-B-011: Complete Buyer Onboarding**
- **Role:** Buyer
- **Action:** Complete profile after registration
- **Evidence:** `apps/web/app/onboarding/buyer/page.tsx`, `apps/api/src/routes/users.ts` (PUT /api/v1/users/me/profile)
- **Status:** Fully implemented
- **Features:**
  - Multi-step form (basic info, location)
  - Profile completion tracking
  - Optional fields (dateOfBirth, address, payment preferences)

**US-B-012: View My Tickets**
- **Role:** Buyer
- **Action:** View purchased tickets
- **Evidence:** `apps/web/app/dashboard/tickets/page.tsx`, `apps/api/src/routes/users.ts` (GET /api/v1/users/tickets)
- **Status:** ✅ Fully implemented
- **Features:**
  - Lists tickets by order ownership or customer email
  - Includes event details, ticket type, seat info
  - Shows ticket status (VALID, USED, CANCELLED, TRANSFERRED)

**US-B-013: View Order History**
- **Role:** Buyer
- **Action:** View past orders
- **Evidence:** `apps/web/app/dashboard/orders/page.tsx`, `apps/api/src/routes/users.ts` (GET /api/v1/users/orders)
- **Status:** ✅ Fully implemented
- **Features:**
  - Lists orders by user ID or customer email
  - Includes event details and ticket counts
  - Shows order status and total amount

**US-B-014: Transfer Ticket**
- **Role:** Buyer
- **Action:** Transfer ticket to another person
- **Evidence:** `apps/api/src/routes/tickets/transfer.ts` (POST /api/v1/tickets/:id/transfer)
- **Status:** ⚠️ PARTIAL - API implemented, UI component exists but may not be fully integrated
- **Features:**
  - Ownership verification
  - Ticket status validation (must be VALID)
  - Email notification to recipient
  - Ticket status update to TRANSFERRED

#### ❌ MISSING

**US-B-015: Download Ticket PDF**
- **Role:** Buyer
- **Action:** Download ticket as PDF
- **Status:** Missing
- **Note:** PDF generation service exists (`apps/api/src/services/pdf.ts`) but download endpoint/UI missing

**US-B-016: View Order Details**
- **Role:** Buyer
- **Action:** View detailed order information
- **Evidence:** `apps/web/app/orders/[id]/page.tsx` exists
- **Status:** ⚠️ PARTIAL - Page exists, needs verification

### Organizer User Stories

#### ✅ IMPLEMENTED

**US-O-001: Register as Organizer**
- **Role:** User
- **Action:** Request ORGANIZER role
- **Evidence:** `apps/web/app/organizer/signup/page.tsx`, `apps/api/src/routes/auth.ts` (POST /api/v1/auth/request-organizer)
- **Status:** Fully implemented
- **Features:**
  - Self-service role request
  - Automatic OrganizerProfile creation
  - Session update with new role
  - Redirect to organizer onboarding

**US-O-002: Complete Organizer Onboarding**
- **Role:** Organizer
- **Action:** Complete business profile setup
- **Evidence:** `apps/web/app/onboarding/organizer/page.tsx`
- **Status:** Fully implemented
- **Features:**
  - Multi-step form (business info, location & tax)
  - Business name and type required
  - Tax ID optional
  - Marks onboarding as completed

**US-O-003: Create Event**
- **Role:** Organizer
- **Action:** Create new event with ticket types
- **Evidence:** `apps/web/app/organizer/events/create/page.tsx`, `apps/api/src/routes/organizer.ts` (POST /api/v1/organizer/events)
- **Status:** Fully implemented
- **Features:**
  - Multi-step form (4 steps)
  - Event details, venue, timing, ticket types
  - Automatic slug generation
  - Unique slug handling
  - Creates event in DRAFT status
  - Supports seated and virtual events

**US-O-004: View My Events**
- **Role:** Organizer
- **Action:** View list of created events
- **Evidence:** `apps/web/app/organizer/dashboard/page.tsx`, `apps/api/src/routes/organizer.ts` (GET /api/v1/organizer/events)
- **Status:** Fully implemented
- **Features:**
  - Lists all events for organizer
  - Includes ticket type counts
  - Shows order and ticket counts
  - Sorted by creation date (newest first)

**US-O-005: View Event Details (Organizer)**
- **Role:** Organizer
- **Action:** View event details in organizer view
- **Evidence:** `apps/api/src/routes/organizer.ts` (GET /api/v1/organizer/events/:id)
- **Status:** Fully implemented
- **Features:**
  - Ownership verification
  - Includes all ticket types
  - Full event data

**US-O-006: Edit Event**
- **Role:** Organizer
- **Action:** Update event details and ticket types
- **Evidence:** `apps/web/app/organizer/events/[id]/page.tsx`, `apps/api/src/routes/organizer.ts` (PUT /api/v1/organizer/events/:id)
- **Status:** ✅ Fully implemented
- **Features:**
  - Update event details
  - Add/update/delete ticket types
  - Slug regeneration if title changes
  - Ownership verification

**US-O-007: Update Event Status**
- **Role:** Organizer
- **Action:** Change event status (publish, cancel, etc.)
- **Evidence:** `apps/api/src/routes/organizer.ts` (PATCH /api/v1/organizer/events/:id/status)
- **Status:** ⚠️ PARTIAL - API implemented, UI controls missing
- **Features:**
  - Status transition validation
  - Valid transitions:
    - DRAFT → PUBLISHED, CANCELLED
    - PUBLISHED → LIVE, CANCELLED, DRAFT
    - LIVE → SOLD_OUT, COMPLETED, CANCELLED
    - SOLD_OUT → COMPLETED, CANCELLED
    - CANCELLED → (no transitions)
    - COMPLETED → (no transitions)

**US-O-008: View Event Analytics**
- **Role:** Organizer
- **Action:** View sales and revenue analytics
- **Evidence:** `apps/api/src/routes/organizer.ts` (GET /api/v1/organizer/events/:id/analytics)
- **Status:** ⚠️ PARTIAL - API implemented, UI exists but may be incomplete
- **Features:**
  - Revenue statistics
  - Ticket sales by type
  - Order statistics
  - Conversion metrics

**US-O-009: Manage Promo Codes**
- **Role:** Organizer
- **Action:** Create, view, update, delete promo codes
- **Evidence:** `apps/api/src/routes/organizer/promo-codes.ts`, `apps/web/app/organizer/promo-codes/`
- **Status:** ✅ Fully implemented
- **Features:**
  - CRUD operations for promo codes
  - Event-specific and global codes
  - Usage tracking
  - Validity date management

**US-O-010: Manage Seats**
- **Role:** Organizer
- **Action:** Create and manage seats for seated events
- **Evidence:** `apps/api/src/routes/organizer.ts` (GET/POST/PUT /api/v1/organizer/events/:id/seats)
- **Status:** ⚠️ PARTIAL - API implemented, UI exists (`apps/web/app/organizer/events/[id]/seats/page.tsx`) but may need verification
- **Features:**
  - Bulk seat creation
  - Seat status management (AVAILABLE, BLOCKED)
  - Section, row, number, tier support

#### ❌ MISSING

**US-O-011: View Waitlist**
- **Role:** Organizer
- **Action:** View waitlist entries for event
- **Evidence:** Backend API may exist
- **Status:** Missing UI
- **Note:** Page exists (`apps/web/app/organizer/events/[id]/waitlist/page.tsx`) but needs verification

**US-O-012: Notify Waitlist Members**
- **Role:** Organizer
- **Action:** Send notifications when tickets become available
- **Status:** Missing

**US-O-013: View Event Orders**
- **Role:** Organizer
- **Action:** View all orders for an event
- **Evidence:** Page exists (`apps/web/app/organizer/events/[id]/orders/page.tsx`)
- **Status:** ⚠️ PARTIAL - Needs verification

**US-O-014: Process Refunds**
- **Role:** Organizer
- **Action:** Process ticket refunds
- **Status:** Missing

**US-O-015: Check-in Attendees**
- **Role:** Organizer
- **Action:** Scan QR codes and check in attendees
- **Evidence:** Page exists (`apps/web/app/organizer/events/[id]/check-in/page.tsx`)
- **Status:** ⚠️ PARTIAL - UI exists, needs verification of functionality

**US-O-016: View Check-in Statistics**
- **Role:** Organizer
- **Action:** View check-in metrics and statistics
- **Status:** Missing

### Dual-Role User Stories

#### ✅ IMPLEMENTED

**US-D-001: Switch Roles**
- **Role:** Dual-role user (BUYER + ORGANIZER)
- **Action:** Switch between buyer and organizer contexts
- **Evidence:** `apps/web/components/layout/RoleSwitcher.tsx`, `apps/api/src/routes/auth.ts` (POST /api/v1/auth/switch-role)
- **Status:** Fully implemented
- **Features:**
  - Header dropdown for role switching
  - Updates activeRole in session
  - Redirects to appropriate dashboard
  - Only shown for users with multiple roles

**US-D-002: Role Selection on Login**
- **Role:** Dual-role user
- **Action:** Select initial role context after login
- **Evidence:** `apps/web/app/auth/select-role/page.tsx`
- **Status:** Fully implemented
- **Features:**
  - Automatic redirect if single role
  - Role selection screen for multiple roles
  - Sets activeRole in session

## Functional Requirements

### Authentication & Authorization

#### FR-AUTH-001: Unified Authentication System
- **Status:** ✅ IMPLEMENTED
- **Description:** Single sign-in endpoint for all users (buyers and organizers)
- **Implementation:** `apps/api/src/routes/auth.ts` (POST /api/v1/auth/login)
- **Business Rules:**
  - All users authenticate through same endpoint
  - Roles loaded from UserRole table
  - Default to BUYER role if no roles assigned
  - Session TTL: 8 hours (buyers), 2 hours (organizers)

#### FR-AUTH-002: Role-Based Access Control
- **Status:** ✅ IMPLEMENTED
- **Description:** Access control based on user roles
- **Implementation:** `apps/api/src/middleware/auth.ts` (requireRole function)
- **Business Rules:**
  - ORGANIZER role required for organizer endpoints
  - BUYER role default for all users
  - ADMIN role exists but not actively used
  - Role verification on every protected endpoint

#### FR-AUTH-003: Session Management
- **Status:** ✅ IMPLEMENTED
- **Description:** HTTP-only cookie-based sessions with Redis storage
- **Implementation:** `apps/api/src/services/session.ts`
- **Business Rules:**
  - Sessions stored in Redis with TTL
  - In-memory fallback for development when Redis unavailable
  - Session activity tracking (60-second debounce)
  - Automatic cleanup of expired sessions

#### FR-AUTH-004: Role Switching
- **Status:** ✅ IMPLEMENTED
- **Description:** Dual-role users can switch between buyer and organizer contexts
- **Implementation:** `apps/api/src/routes/auth.ts` (POST /api/v1/auth/switch-role)
- **Business Rules:**
  - Only users with ORGANIZER role can switch to organizer mode
  - activeRole stored in session
  - Redirects to appropriate dashboard after switch

### Event Management

#### FR-EV-001: Event Creation
- **Status:** ✅ IMPLEMENTED
- **Description:** Organizers can create events with multiple ticket types
- **Implementation:** `apps/api/src/routes/organizer.ts` (POST /api/v1/organizer/events)
- **Business Rules:**
  - Events created in DRAFT status
  - Automatic slug generation from title
  - Unique slug enforcement (appends counter if duplicate)
  - At least one ticket type required
  - Supports seated and virtual events

#### FR-EV-002: Event Editing
- **Status:** ✅ IMPLEMENTED
- **Description:** Organizers can update event details and ticket types
- **Implementation:** `apps/api/src/routes/organizer.ts` (PUT /api/v1/organizer/events/:id)
- **Business Rules:**
  - Ownership verification required
  - Slug regenerated if title changes
  - Ticket types can be added, updated, or deleted
  - Cannot delete ticket types with sold tickets (enforced by Prisma cascade)

#### FR-EV-003: Event Status Management
- **Status:** ⚠️ PARTIAL - API implemented, UI missing
- **Description:** Organizers can change event status with validation
- **Implementation:** `apps/api/src/routes/organizer.ts` (PATCH /api/v1/organizer/events/:id/status)
- **Business Rules:**
  - Status transitions validated
  - Invalid transitions rejected with error
  - CANCELLED and COMPLETED are terminal states

#### FR-EV-004: Event Listing & Search
- **Status:** ✅ IMPLEMENTED
- **Description:** Public event listing with filters and search
- **Implementation:** `apps/api/src/routes/events.ts`
- **Business Rules:**
  - Only PUBLISHED/LIVE events shown
  - Events must have active sale period (saleStart <= now <= saleEnd)
  - Filtering by category, city, date
  - Pagination support
  - Redis caching (5 min TTL)

### Ticket Purchasing

#### FR-TK-001: Ticket Reservation
- **Status:** ✅ IMPLEMENTED
- **Description:** Atomic ticket reservation system
- **Implementation:** `apps/api/src/routes/tickets.ts` (POST /api/v1/tickets/reserve)
- **Business Rules:**
  - Atomic operations using Redis Lua scripts
  - Prevents overselling
  - 10-minute reservation expiry
  - Seat-specific reservations for seated events
  - Max per order validation

#### FR-TK-002: Seat Selection
- **Status:** ✅ IMPLEMENTED
- **Description:** Seat selection for seated events
- **Implementation:** `apps/web/components/tickets/SeatMap.tsx`, `apps/web/components/tickets/TicketSelector.tsx`
- **Business Rules:**
  - Seat count must match ticket quantity
  - Only AVAILABLE and RESERVED seats selectable
  - Seat IDs converted to strings for consistency
  - Visual feedback for selected seats

#### FR-TK-003: Checkout Flow
- **Status:** ✅ IMPLEMENTED
- **Description:** Complete checkout process with payment
- **Implementation:** `apps/web/app/checkout/page.tsx`
- **Business Rules:**
  - Reservation validation before checkout
  - Promo code application
  - Order creation
  - Payment initialization
  - Ticket generation on payment success

#### FR-TK-004: Guest Checkout
- **Status:** ✅ IMPLEMENTED
- **Description:** Purchase tickets without account
- **Implementation:** `apps/api/src/routes/orders.ts`
- **Business Rules:**
  - Customer email required
  - Customer name and phone optional
  - Order linked to user if authenticated
  - Tickets accessible via customer email

### Payment Processing

#### FR-PAY-001: Payment Initialization
- **Status:** ✅ IMPLEMENTED
- **Description:** Initialize Paystack payment
- **Implementation:** `apps/api/src/routes/payments.ts` (POST /api/v1/payments/initialize)
- **Business Rules:**
  - Free tickets (amount = 0) skip Paystack
  - Payment reference generated
  - Order updated with reference
  - Callback URL set for redirect

#### FR-PAY-002: Payment Verification
- **Status:** ✅ IMPLEMENTED
- **Description:** Verify payment status
- **Implementation:** `apps/api/src/routes/payments.ts` (POST /api/v1/payments/verify)
- **Business Rules:**
  - Free tickets auto-verified
  - Paystack API verification for paid tickets
  - Order status updated to PAID on success
  - Tickets generated on successful payment

#### FR-PAY-003: Webhook Handling
- **Status:** ✅ IMPLEMENTED
- **Description:** Handle Paystack webhooks
- **Implementation:** `apps/api/src/routes/webhooks.ts` (POST /api/v1/webhooks/paystack)
- **Business Rules:**
  - Signature verification required
  - Handles charge.success and charge.failed events
  - Idempotent processing (checks order status)
  - Email and SMS notifications on success
  - Reservation release on failure

### Promo Codes

#### FR-PC-001: Promo Code Validation
- **Status:** ✅ IMPLEMENTED
- **Description:** Validate promo code before application
- **Implementation:** `apps/api/src/routes/promo-codes.ts` (POST /api/v1/promo-codes/validate)
- **Business Rules:**
  - Code must be active
  - Must be within validity dates
  - Event applicability check
  - Minimum order amount validation
  - Usage limit checks (max uses, max per user)
  - Discount calculation (percentage or fixed)

#### FR-PC-002: Promo Code Management
- **Status:** ✅ IMPLEMENTED
- **Description:** CRUD operations for promo codes
- **Implementation:** `apps/api/src/routes/organizer/promo-codes.ts`
- **Business Rules:**
  - Organizers can create event-specific or global codes
  - Code uniqueness enforced
  - Event ownership verification for event-specific codes
  - Usage tracking (currentUses)

## Happy Path Flows

### Flow 1: Buyer Purchases Tickets (Guest)

```
1. User browses events → GET /api/v1/events
2. User views event details → GET /api/v1/events/slug/:slug
3. User selects tickets → Frontend validation
4. User selects seats (if seated) → Frontend validation
5. User clicks "Continue to Checkout"
6. System reserves tickets → POST /api/v1/tickets/reserve
   - Atomic Redis reservation
   - 10-minute expiry
7. User enters customer info and applies promo code (optional)
8. System validates promo code → POST /api/v1/promo-codes/validate
9. System creates order → POST /api/v1/orders
10. System initializes payment → POST /api/v1/payments/initialize
11. User completes payment on Paystack
12. Paystack webhook → POST /api/v1/webhooks/paystack
13. System verifies payment → Updates order to PAID
14. System generates tickets → TicketService.generateTicketsForOrder
15. System sends confirmation email → BrevoService
16. System sends confirmation SMS → TwilioService (if phone provided)
17. User redirected to success page
```

### Flow 2: Organizer Creates Event

```
1. Organizer logs in → POST /api/v1/auth/login
2. System redirects to /organizer/dashboard (if single role) or /auth/select-role
3. Organizer navigates to create event → /organizer/events/create
4. Organizer fills multi-step form:
   - Step 1: Title, description, category
   - Step 2: Venue details (or virtual flag)
   - Step 3: Start/end dates, sale dates
   - Step 4: Ticket types (name, price, quantity, limits)
5. Organizer submits → POST /api/v1/organizer/events
6. System validates input → Zod schema validation
7. System generates unique slug
8. System creates event in DRAFT status
9. System creates ticket types
10. Organizer redirected to event management page
```

### Flow 3: Dual-Role User Switches Context

```
1. User logs in with BUYER + ORGANIZER roles → POST /api/v1/auth/login
2. System detects multiple roles → Redirects to /auth/select-role
3. User selects role (e.g., "Organizer Mode")
4. System updates session → POST /api/v1/auth/switch-role
5. System sets activeRole = 'organizer' in session
6. User redirected to /organizer/dashboard
7. User can switch roles via header dropdown → RoleSwitcher component
8. System updates activeRole and redirects appropriately
```

## Edge Cases & "What Ifs"

### ✅ Handled Edge Cases

**EC-001: Concurrent Ticket Reservations**
- **Scenario:** Multiple users try to reserve the last ticket simultaneously
- **Handling:** ✅ IMPLEMENTED
- **Implementation:** Redis Lua script for atomic operations (`apps/api/src/services/redis.ts`)
- **Result:** Only one reservation succeeds, others fail gracefully

**EC-002: Reservation Expiry**
- **Scenario:** User reserves tickets but doesn't complete checkout within 10 minutes
- **Handling:** ✅ IMPLEMENTED
- **Implementation:** Reservation expiry tracked, released automatically
- **Result:** Tickets become available again, user sees error if they try to checkout

**EC-003: Promo Code Validation Failures**
- **Scenario:** Promo code expired, max uses reached, or invalid event
- **Handling:** ✅ IMPLEMENTED
- **Implementation:** Comprehensive validation in `apps/api/src/routes/promo-codes.ts`
- **Result:** Clear error messages for each failure case

**EC-004: Free Tickets**
- **Scenario:** Event has free tickets (price = 0)
- **Handling:** ✅ IMPLEMENTED
- **Implementation:** Auto-mark as PAID, skip Paystack (`apps/api/src/routes/payments.ts`)
- **Result:** Free tickets automatically processed without payment

**EC-005: Redis Unavailability**
- **Scenario:** Redis service is down or slow
- **Handling:** ✅ IMPLEMENTED
- **Implementation:** In-memory fallback for development, timeout protection
- **Result:** Development continues, production requires Redis

**EC-006: Payment Webhook Duplicates**
- **Scenario:** Paystack sends duplicate webhook events
- **Handling:** ✅ IMPLEMENTED
- **Implementation:** Idempotent processing (checks order status before updating)
- **Result:** Duplicate webhooks ignored safely

**EC-007: Seat Selection Mismatch**
- **Scenario:** User selects wrong number of seats
- **Handling:** ✅ IMPLEMENTED
- **Implementation:** Frontend validation in TicketSelector
- **Result:** Error message, checkout button disabled

**EC-008: Event Status Transitions**
- **Scenario:** Organizer tries invalid status transition
- **Handling:** ✅ IMPLEMENTED
- **Implementation:** Status transition validation in organizer routes
- **Result:** Error returned, transition rejected

**EC-009: Failed Login Attempts**
- **Scenario:** User enters wrong password multiple times
- **Handling:** ✅ IMPLEMENTED
- **Implementation:** failedLoginAttempts tracking, accountLockedUntil field exists
- **Result:** Attempts tracked (lockout logic may need activation)

**EC-010: Slug Collisions**
- **Scenario:** Two events have same title
- **Handling:** ✅ IMPLEMENTED
- **Implementation:** Automatic slug suffix (title-1, title-2, etc.)
- **Result:** Unique slugs guaranteed

### ❌ Missing Edge Cases

**EC-M-001: Ticket Type Deletion with Sold Tickets**
- **Scenario:** Organizer tries to delete ticket type that has sold tickets
- **Handling:** ❌ MISSING
- **Risk:** Prisma cascade may prevent deletion, but no explicit validation/error message
- **Recommendation:** Add validation to prevent deletion of ticket types with soldQuantity > 0

**EC-M-002: Event Deletion with Orders**
- **Scenario:** Organizer tries to delete event with existing orders
- **Handling:** ❌ MISSING
- **Risk:** No delete endpoint exists, but if added, needs cascade handling
- **Recommendation:** Soft delete or prevent deletion if orders exist

**EC-M-003: Payment Timeout**
- **Scenario:** User initiates payment but Paystack times out
- **Handling:** ⚠️ PARTIAL
- **Current:** No explicit timeout handling
- **Recommendation:** Add timeout handling and retry logic

**EC-M-004: Email/SMS Delivery Failure**
- **Scenario:** Brevo or Twilio API fails
- **Handling:** ⚠️ PARTIAL
- **Current:** Services log errors but don't retry
- **Recommendation:** Add retry logic and fallback mechanisms

**EC-M-005: Seat Reservation Race Condition**
- **Scenario:** Two users select same seat simultaneously
- **Handling:** ⚠️ PARTIAL
- **Current:** Seat status updated but no atomic operation for seat selection
- **Recommendation:** Add Redis-based seat reservation similar to ticket reservation

**EC-M-006: Promo Code Usage Tracking**
- **Scenario:** Promo code applied but order fails
- **Handling:** ❌ MISSING
- **Risk:** currentUses may be incremented incorrectly
- **Recommendation:** Only increment usage on successful payment

**EC-M-007: Refund Processing**
- **Scenario:** Organizer needs to refund a ticket
- **Handling:** ❌ MISSING
- **Risk:** No refund functionality exists
- **Recommendation:** Implement refund API and UI

**EC-M-008: Ticket Transfer Validation**
- **Scenario:** User tries to transfer ticket after event started
- **Handling:** ❌ MISSING
- **Risk:** No validation for event timing
- **Recommendation:** Add event date validation to transfer endpoint

**EC-M-009: Account Lockout**
- **Scenario:** Account locked due to failed login attempts
- **Handling:** ⚠️ PARTIAL
- **Current:** accountLockedUntil field exists but lockout logic not active
- **Recommendation:** Activate account lockout after N failed attempts

**EC-M-010: Session Expiry During Checkout**
- **Scenario:** User session expires while completing checkout
- **Handling:** ⚠️ PARTIAL
- **Current:** Guest checkout supported, but authenticated users may lose session
- **Recommendation:** Extend session on checkout page activity

## Business Rules

### BR-001: User Registration
- **Rule:** All new users receive BUYER role by default
- **Implementation:** `apps/api/src/routes/auth.ts` (POST /api/v1/auth/register)
- **Status:** ✅ IMPLEMENTED

### BR-002: Organizer Role Request
- **Rule:** Users can self-request ORGANIZER role
- **Implementation:** `apps/api/src/routes/auth.ts` (POST /api/v1/auth/request-organizer)
- **Status:** ✅ IMPLEMENTED
- **Note:** No approval process - role granted immediately

### BR-003: Event Status Default
- **Rule:** New events created in DRAFT status
- **Implementation:** `apps/api/src/routes/organizer.ts` (POST /api/v1/organizer/events)
- **Status:** ✅ IMPLEMENTED

### BR-004: Event Visibility
- **Rule:** Only PUBLISHED or LIVE events visible to public
- **Implementation:** `apps/api/src/routes/events.ts` (GET /api/v1/events)
- **Status:** ✅ IMPLEMENTED
- **Additional:** Events must have active sale period (saleStart <= now <= saleEnd)

### BR-005: Ticket Reservation Expiry
- **Rule:** Ticket reservations expire after 10 minutes (configurable)
- **Implementation:** `apps/api/src/routes/tickets.ts`, `apps/api/src/services/redis.ts`
- **Status:** ✅ IMPLEMENTED
- **Config:** `config.reservation.expiryMinutes`

### BR-006: Free Ticket Auto-Payment
- **Rule:** Tickets with price = 0 automatically marked as PAID
- **Implementation:** `apps/api/src/routes/payments.ts`, `apps/api/src/routes/orders.ts`
- **Status:** ✅ IMPLEMENTED

### BR-007: Platform and Processing Fees
- **Rule:** Fees calculated only on paid tickets (not free)
- **Implementation:** `apps/api/src/routes/orders.ts`
- **Status:** ✅ IMPLEMENTED
- **Formula:**
  - Platform fee: `subtotal * platformFeePercent / 100`
  - Processing fee: `(subtotal * processingFeePercent / 100) + processingFeeFixed`
  - Total: `subtotal + platformFee + processingFee - discountAmount`

### BR-008: Promo Code Discount Limits
- **Rule:** Discount cannot exceed order amount
- **Implementation:** `apps/api/src/routes/promo-codes.ts`
- **Status:** ✅ IMPLEMENTED
- **Formula:** `discountAmount = Math.min(calculatedDiscount, orderAmount)`

### BR-009: Seat Selection Requirement
- **Rule:** For seated events, number of selected seats must equal ticket quantity
- **Implementation:** `apps/web/components/tickets/TicketSelector.tsx`
- **Status:** ✅ IMPLEMENTED

### BR-010: Ticket Type Limits
- **Rule:** Min/max per order enforced
- **Implementation:** `apps/api/src/routes/tickets.ts`, frontend validation
- **Status:** ✅ IMPLEMENTED

### BR-011: Session Timeout
- **Rule:** Organizer sessions expire after 2 hours, buyer sessions after 8 hours
- **Implementation:** `apps/api/src/services/session.ts`
- **Status:** ✅ IMPLEMENTED

### BR-012: Role-Based Redirects
- **Rule:** Login redirects based on roles
- **Implementation:** `apps/web/app/auth/login/page.tsx`
- **Status:** ✅ IMPLEMENTED
- **Logic:**
  - Multiple roles → `/auth/select-role`
  - Single ORGANIZER role → `/organizer/dashboard`
  - Single BUYER role (or default) → `/dashboard/tickets`

### BR-013: Profile Completion
- **Rule:** Buyers redirected to onboarding if profile incomplete
- **Implementation:** `apps/web/hooks/useProfileCheck.ts`
- **Status:** ✅ IMPLEMENTED
- **Check:** firstName and lastName required for buyer profile

### BR-014: Organizer Onboarding
- **Rule:** Organizers redirected to onboarding if profile incomplete
- **Implementation:** `apps/web/hooks/useProfileCheck.ts`
- **Status:** ✅ IMPLEMENTED
- **Check:** onboardingCompleted flag must be true

### BR-015: Slug Uniqueness
- **Rule:** Event slugs must be unique
- **Implementation:** `apps/api/src/routes/organizer.ts`
- **Status:** ✅ IMPLEMENTED
- **Method:** Auto-append counter if duplicate (title-1, title-2, etc.)

## Validation Rules

### Input Validation

**Email Validation:**
- Format: Standard email regex
- Uniqueness: Enforced at database level
- Implementation: Zod schema validation

**Password Validation:**
- Minimum length: 8 characters
- Implementation: Zod schema (`z.string().min(8)`)

**Event Title:**
- Required: Yes
- Min length: 1 character
- Implementation: Zod schema (`z.string().min(1)`)

**Ticket Quantity:**
- Min: 1
- Max: maxPerOrder (default 4)
- Type: Integer
- Implementation: Zod schema (`z.number().int().min(1)`)

**Ticket Price:**
- Min: 0 (allows free tickets)
- Type: Decimal (10, 2)
- Implementation: Prisma Decimal type

**Promo Code Discount:**
- Percentage: 0-100%
- Fixed: Must be positive
- Implementation: Zod schema validation

### Business Logic Validation

**Event Status Transitions:**
- Valid transitions defined in code
- Invalid transitions rejected with error
- Implementation: `apps/api/src/routes/organizer.ts` (statusUpdateSchema)

**Ticket Availability:**
- Check: `totalQuantity - soldQuantity - reservedQuantity >= requestedQuantity`
- Implementation: `apps/api/src/routes/tickets.ts`

**Promo Code Validity:**
- Active status check
- Date range validation
- Usage limit checks
- Event applicability
- Minimum order amount
- Implementation: `apps/api/src/routes/promo-codes.ts`

**Seat Selection:**
- Seat count must match ticket quantity
- Seats must be AVAILABLE or RESERVED
- Implementation: Frontend validation in TicketSelector

## Error Handling

### Implemented Error Handling

**API Error Responses:**
- Standard format: `{ success: false, error: string }`
- HTTP status codes: 400 (validation), 401 (unauthorized), 403 (forbidden), 404 (not found), 500 (server error)
- Implementation: Fastify error handler in `apps/api/src/app.ts`

**Validation Errors:**
- Zod schema validation with detailed error messages
- Implementation: Automatic via Fastify-Zod integration

**Database Errors:**
- Prisma error handling
- Unique constraint violations handled
- Implementation: Try-catch blocks in route handlers

**Redis Errors:**
- Timeout protection (2-second timeout)
- In-memory fallback for development
- Graceful degradation
- Implementation: `apps/api/src/services/session.ts`, `apps/api/src/services/redis.ts`

### Missing Error Handling

**Payment API Failures:**
- Paystack API errors may not be fully handled
- Recommendation: Add retry logic and better error messages

**Email/SMS Delivery Failures:**
- Services log errors but don't retry
- Recommendation: Add retry queue or background job processing

**File Upload Failures:**
- S3 upload errors may not be fully handled
- Recommendation: Add retry logic and error recovery

**Database Connection Failures:**
- Prisma connection errors handled but may need improvement
- Recommendation: Add connection retry logic
