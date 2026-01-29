# PRD 04: User Journeys

## Buyer Journey

### Journey 1: First-Time Buyer (Guest Checkout)

```
1. Discovery
   User visits homepage → / 
   Views featured events
   Clicks "Browse Events" → /events

2. Event Browsing
   Filters by category/city/date
   Views event list
   Clicks event → /events/[slug]

3. Event Details
   Reads event description
   Views ticket types and pricing
   Selects ticket quantity
   (If seated) Selects seats
   Clicks "Continue to Checkout"

4. Ticket Reservation
   System reserves tickets (10-min expiry)
   Redirects to /checkout

5. Checkout
   Enters customer info (email, name, phone)
   (Optional) Applies promo code
   Reviews order total
   Clicks "Pay Now"

6. Payment
   Redirected to Paystack
   Completes payment
   Returns to /checkout/success

7. Confirmation
   Receives email with tickets
   (If phone provided) Receives SMS
   Can view tickets via email link
```

### Journey 2: Registered Buyer

```
1. Registration
   User visits /auth/register
   Enters email, password, name
   Submits form
   System creates account with BUYER role
   Redirects to /onboarding/buyer

2. Onboarding
   Completes buyer profile:
     - First name, last name (required)
     - Date of birth (optional)
     - Address, city, country (optional)
     - Payment preferences (optional)
   Submits form
   Redirects to /dashboard/tickets

3. Event Discovery
   Same as Journey 1 (steps 1-3)

4. Ticket Purchase
   Same as Journey 1 (steps 4-7)
   Order linked to user account

5. Ticket Management
   Views tickets → /dashboard/tickets
   Views order history → /dashboard/orders
   Can transfer tickets (if implemented)
```

### Journey 3: Buyer with Incomplete Profile

```
1. Login
   User logs in → /auth/login
   System detects incomplete profile
   Redirects to /onboarding/buyer

2. Profile Completion
   User completes required fields
   Submits form
   Redirects to /dashboard/tickets

3. Normal Usage
   Continues with normal buyer journey
```

## Organizer Journey

### Journey 1: New Organizer Registration

```
1. Initial Registration
   User registers as buyer → /auth/register
   Completes buyer onboarding
   Now has BUYER role only

2. Request Organizer Access
   User visits /organizer/signup
   Clicks "Request Organizer Access"
   System grants ORGANIZER role
   Creates OrganizerProfile (onboardingCompleted: false)
   Redirects to /onboarding/organizer

3. Organizer Onboarding
   Completes business profile:
     - Business name (required)
     - Business type (required)
     - Business address, city, country (optional)
     - Tax ID (optional)
   Submits form
   System sets onboardingCompleted: true
   Redirects to /organizer/dashboard

4. Create First Event
   Clicks "Create Event"
   Fills multi-step form:
     Step 1: Title, description, category
     Step 2: Venue details
     Step 3: Dates and timing
     Step 4: Ticket types
   Submits form
   Event created in DRAFT status
   Redirects to event management page

5. Publish Event
   (If UI exists) Clicks "Publish"
   System updates status to PUBLISHED
   Event becomes visible to public
```

### Journey 2: Existing Organizer

```
1. Login
   User logs in → /auth/login
   System detects ORGANIZER role
   Redirects to /organizer/dashboard

2. View Events
   Sees list of created events
   Views event statistics (orders, tickets sold)
   Clicks event to manage

3. Event Management
   Views event details
   (If UI exists) Edits event
   (If UI exists) Updates status
   Views analytics
   Manages promo codes
   Views orders
```

### Journey 3: Organizer with Incomplete Profile

```
1. Login
   User logs in with ORGANIZER role
   System detects incomplete organizer profile
   Redirects to /onboarding/organizer

2. Profile Completion
   User completes business profile
   Submits form
   Redirects to /organizer/dashboard

3. Normal Usage
   Continues with normal organizer journey
```

## Dual-Role User Journey

### Journey 1: User with Both Roles

```
1. Registration
   User registers → Gets BUYER role
   Completes buyer onboarding

2. Request Organizer
   User requests ORGANIZER role
   System grants ORGANIZER role
   User now has BUYER + ORGANIZER roles
   Completes organizer onboarding

3. Login
   User logs in → /auth/login
   System detects multiple roles
   Redirects to /auth/select-role

4. Role Selection
   User selects "Buyer Mode" or "Organizer Mode"
   System sets activeRole in session
   Redirects to appropriate dashboard

5. Role Switching
   User clicks role switcher in header
   Selects different role
   System updates activeRole
   Redirects to appropriate dashboard

6. Context-Specific Actions
   In Buyer Mode:
     - Browse and purchase tickets
     - View own tickets and orders
   In Organizer Mode:
     - Create and manage events
     - View analytics
     - Manage promo codes
```

## Authentication Flows

### Flow 1: Unified Login Flow

```
User visits /auth/login
    ↓
Enters email and password
    ↓
POST /api/v1/auth/login
    ↓
Backend validates credentials
    ↓
Loads roles from UserRole table
    ↓
Creates session in Redis
    ↓
Sets HTTP-only cookie
    ↓
Returns user data with roles array
    ↓
Frontend checks roles:
    - Single role → Set activeRole, redirect to dashboard
    - Multiple roles → Redirect to /auth/select-role
    ↓
User selects role (if multiple)
    ↓
POST /api/v1/auth/switch-role
    ↓
System updates activeRole in session
    ↓
Redirects to appropriate dashboard
```

### Flow 2: Registration Flow

```
User visits /auth/register
    ↓
Enters email, password, name, phone
    ↓
POST /api/v1/auth/register
    ↓
System validates input
    ↓
Checks if user exists
    ↓
Hashes password
    ↓
Creates user with BUYER role
    ↓
Creates BuyerProfile
    ↓
Creates session
    ↓
Sets HTTP-only cookie
    ↓
Redirects to /onboarding/buyer
```

### Flow 3: Organizer Role Request Flow

```
User (with BUYER role) visits /organizer/signup
    ↓
Clicks "Request Organizer Access"
    ↓
POST /api/v1/auth/request-organizer
    ↓
System checks if ORGANIZER role exists
    ↓
Creates UserRole entry (ORGANIZER)
    ↓
Creates/updates OrganizerProfile
    ↓
Updates session with new role
    ↓
Redirects to /onboarding/organizer
```

### Flow 4: Logout Flow

```
User clicks "Logout"
    ↓
POST /api/v1/auth/logout
    ↓
System deletes session from Redis
    ↓
Clears HTTP-only cookie
    ↓
Clears local storage
    ↓
Redirects to homepage
```

## Onboarding Flows

### Buyer Onboarding Flow

```
User completes registration
    ↓
Redirected to /onboarding/buyer
    ↓
Step 1: Basic Information
   - First name (required)
   - Last name (required)
   - Date of birth (optional)
   ↓
User clicks "Next"
    ↓
Step 2: Location & Preferences
   - Address (optional)
   - City (optional)
   - Country (default: Nigeria)
   - Preferred payment method (optional)
   ↓
User clicks "Complete Profile" or "Skip"
    ↓
PUT /api/v1/users/me/profile
    ↓
System updates BuyerProfile
    ↓
Redirects to /dashboard/tickets
```

### Organizer Onboarding Flow

```
User requests ORGANIZER role
    ↓
Redirected to /onboarding/organizer
    ↓
Step 1: Business Information
   - Business name (required)
   - Business type (required)
   ↓
User clicks "Next"
    ↓
Step 2: Location & Tax
   - Business address (optional)
   - Business city (optional)
   - Business country (default: Nigeria)
   - Tax ID (optional)
   ↓
User clicks "Complete Setup" or "Skip"
    ↓
PUT /api/v1/users/me/profile
    ↓
System updates OrganizerProfile
   Sets onboardingCompleted: true
    ↓
Redirects to /organizer/dashboard
```

## Ticket Purchase Flow (Detailed)

### Step-by-Step Flow

```
1. Event Discovery
   GET /api/v1/events
   Returns: List of published events
   Cache: 5 minutes

2. Event Details
   GET /api/v1/events/slug/:slug
   Returns: Event with ticket types and seats
   Cache: 1 minute

3. Ticket Selection
   User selects ticket types and quantities
   Frontend validation:
     - Quantity >= minPerOrder
     - Quantity <= maxPerOrder
     - Quantity <= available

4. Seat Selection (if seated)
   User selects seats
   Frontend validation:
     - Seat count = ticket quantity
     - Seats are AVAILABLE or RESERVED

5. Availability Check
   GET /api/v1/tickets/availability?eventId=...&ticketTypeId=...&quantity=...
   Returns: Available count, canReserve flag

6. Ticket Reservation
   POST /api/v1/tickets/reserve
   Body: { eventId, ticketTypeId, quantity, seatIds? }
   Process:
     - Atomic Redis reservation (Lua script)
     - Creates InventoryReservation record
     - Updates reservedQuantity
   Returns: { reservationId, expiresAt }

7. Checkout Page
   User enters customer info
   (Optional) Applies promo code
   POST /api/v1/promo-codes/validate
   Returns: Discount amount

8. Order Creation
   POST /api/v1/orders
   Body: { eventId, ticketTypeId, quantity, customerEmail, ... }
   Process:
     - Calculates pricing
     - Applies promo code discount
     - Calculates fees
     - Creates order (PENDING status)
     - Links reservation to order
   Returns: { orderId, orderNumber, totalAmount }

9. Payment Initialization
   POST /api/v1/payments/initialize
   Body: { orderId, email, amount }
   Process:
     - If amount = 0: Auto-mark as PAID, skip Paystack
     - Else: Initialize Paystack transaction
     - Generate payment reference
   Returns: { authorizationUrl, reference }

10. Payment Completion
    User completes payment on Paystack
    Paystack redirects to /checkout/success?reference=...

11. Payment Verification
    POST /api/v1/payments/verify
    Body: { reference }
    Process:
      - Verifies with Paystack (or auto-verifies free tickets)
      - Updates order to PAID
    Returns: { status: 'success' }

12. Webhook Processing (async)
    POST /api/v1/webhooks/paystack
    Process:
      - Verifies signature
      - Updates order status
      - Generates tickets
      - Uploads QR codes and PDFs to S3
      - Sends email confirmation
      - Sends SMS confirmation (if phone provided)

13. Success Page
    User views order confirmation
    Can access tickets via email
```

## Event Management Flow (Organizer)

### Create Event Flow

```
1. Navigate to Create Event
   /organizer/events/create

2. Step 1: Basic Information
   - Title (required)
   - Description (optional)
   - Category (required)
   Validation: Title and category required

3. Step 2: Venue Details
   - Venue name (required if not virtual)
   - Venue address (required if not virtual)
   - City (required)
   - Country (default: Nigeria)
   - Virtual event flag
   Validation: Venue required if not virtual

4. Step 3: Dates & Timing
   - Start date/time (required)
   - End date/time (required)
   - Sale start date (required)
   - Sale end date (required)
   Validation:
     - End date > start date
     - All dates required

5. Step 4: Ticket Types
   - Add ticket types:
     * Name (required)
     * Description (optional)
     * Price (required, >= 0)
     * Currency (default: NGN)
     * Total quantity (required, > 0)
     * Max per order (default: 4)
     * Min per order (default: 1)
   Validation:
     - At least one ticket type required
     - All ticket types must have name and price

6. Submit
   POST /api/v1/organizer/events
   Process:
     - Generates unique slug
     - Creates event in DRAFT status
     - Creates ticket types
   Returns: Created event

7. Redirect
   Redirects to /organizer/events/[id]
```

### Edit Event Flow

```
1. Navigate to Event
   /organizer/events/[id]

2. Edit Details
   User modifies event information
   (Same steps as create, but with existing data)

3. Submit
   PUT /api/v1/organizer/events/:id
   Process:
     - Verifies ownership
     - Regenerates slug if title changed
     - Updates event
     - Updates/creates/deletes ticket types
   Returns: Updated event
```

### Publish Event Flow

```
1. Event in DRAFT status
   Organizer views event

2. Publish Action
   (If UI exists) Clicks "Publish"
   PATCH /api/v1/organizer/events/:id/status
   Body: { status: 'PUBLISHED' }

3. Status Validation
   System validates transition (DRAFT → PUBLISHED allowed)
   Updates event status

4. Event Visibility
   Event now appears in public listings
   Event must have active sale period to be visible
```

## Error Recovery Flows

### Flow 1: Reservation Expiry

```
User reserves tickets
    ↓
10 minutes pass
    ↓
Reservation expires
    ↓
User tries to checkout
    ↓
System detects expired reservation
    ↓
Shows error: "Reservation expired"
    ↓
User must return to event page
    ↓
Reselects tickets
    ↓
New reservation created
```

### Flow 2: Payment Failure

```
User completes payment
    ↓
Payment fails on Paystack
    ↓
Paystack webhook: charge.failed
    ↓
System updates order to FAILED
    ↓
System releases reservations
    ↓
User sees error on success page
    ↓
User can retry payment
```

### Flow 3: Session Expiry

```
User session expires during checkout
    ↓
System detects expired session
    ↓
(If guest) Continues with guest checkout
    ↓
(If authenticated) Redirects to login
    ↓
User logs in again
    ↓
Redirects back to checkout (if possible)
```

## Journey Status Summary

### ✅ Fully Implemented Journeys

1. Guest buyer ticket purchase
2. Registered buyer registration and onboarding
3. Buyer ticket viewing and order history
4. Organizer registration and onboarding
5. Organizer event creation
6. Dual-role user role switching
7. Unified login with role selection

### ⚠️ Partially Implemented Journeys

1. Organizer event editing (UI exists, needs verification)
2. Organizer event status management (API exists, UI missing)
3. Organizer analytics viewing (API exists, UI may be incomplete)
4. Ticket transfer (API exists, UI component exists but may not be integrated)

### ❌ Missing Journeys

1. Organizer waitlist management
2. Organizer order management
3. Organizer check-in process
4. Ticket PDF download
5. Refund processing
