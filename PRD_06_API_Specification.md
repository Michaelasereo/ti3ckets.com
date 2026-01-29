# PRD 06: API Specification

## API Overview

All API endpoints are prefixed with `/api/v1/`. The API uses Fastify and follows RESTful conventions where appropriate.

### Base URL

- **Development:** `http://localhost:8080/api/v1`
- **Production:** `https://api.getiickets.com/api/v1` (example)

### Authentication

**Session-Based (Primary):**
- HTTP-only cookies with `session` cookie name
- Cookie attributes:
  - `httpOnly: true`
  - `secure: true` (production only)
  - `sameSite: 'strict'`
  - `maxAge: 28800` (buyers) or `7200` (organizers)
  - `path: '/'`

**JWT Fallback (Backward Compatibility):**
- Bearer token in `Authorization` header
- Format: `Authorization: Bearer <token>`
- Not actively used, maintained for backward compatibility

### Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "details": { ... } // Optional, for validation errors
}
```

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error
- `503` - Service Unavailable (health check)

## Public Endpoints

### Events

#### GET /api/v1/events

List published events with filters.

**Query Parameters:**
- `category` (string, optional) - Filter by category
- `city` (string, optional) - Filter by city
- `date` (string, optional) - Filter by date (YYYY-MM-DD)
- `page` (number, optional, default: 1) - Page number
- `limit` (number, optional, default: 20) - Items per page

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "title": "string",
      "slug": "string",
      "description": "string",
      "category": "string",
      "imageUrl": "string",
      "bannerUrl": "string",
      "venueName": "string",
      "venueAddress": "string",
      "city": "string",
      "country": "string",
      "startDateTime": "ISO8601",
      "endDateTime": "ISO8601",
      "ticketTypes": [
        {
          "id": "string",
          "name": "string",
          "price": "decimal",
          "currency": "string",
          "totalQuantity": "number",
          "soldQuantity": "number"
        }
      ],
      "organizer": {
        "id": "string",
        "name": "string"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**Caching:** 5 minutes (Redis)

**Filters Applied:**
- Status: PUBLISHED or LIVE
- Sale period: saleStart <= now <= saleEnd

#### GET /api/v1/events/search

Search events by keyword.

**Query Parameters:**
- `q` (string, required) - Search query

**Response:**
```json
{
  "success": true,
  "data": [ /* Event objects */ ]
}
```

**Search Fields:**
- Event title
- Event description
- Venue name
- City

**Limit:** 20 results

#### GET /api/v1/events/slug/:slug

Get event by slug.

**Path Parameters:**
- `slug` (string) - Event slug

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "title": "string",
    "slug": "string",
    "description": "string",
    "category": "string",
    "imageUrl": "string",
    "bannerUrl": "string",
    "venueName": "string",
    "venueAddress": "string",
    "city": "string",
    "country": "string",
    "isVirtual": "boolean",
    "isSeated": "boolean",
    "startDateTime": "ISO8601",
    "endDateTime": "ISO8601",
    "saleStart": "ISO8601",
    "saleEnd": "ISO8601",
    "status": "string",
    "ticketTypes": [ /* TicketType objects */ ],
    "seats": [ /* Seat objects, only if isSeated = true */ ],
    "organizer": {
      "id": "string",
      "name": "string",
      "email": "string"
    }
  }
}
```

**Caching:** 1 minute (Redis)

**Seats:**
- Only included if `isSeated = true`
- Limited to 2000 seats for performance
- Only AVAILABLE and RESERVED seats included

#### GET /api/v1/events/:id

Get event by ID.

**Path Parameters:**
- `id` (string) - Event ID

**Response:** Same as `/slug/:slug`

**Caching:** 1 minute (Redis)

### Tickets

#### GET /api/v1/tickets/availability

Check ticket availability.

**Query Parameters:**
- `eventId` (string, required)
- `ticketTypeId` (string, required)
- `quantity` (string, required) - Converted to integer

**Response:**
```json
{
  "success": true,
  "data": {
    "available": 50,
    "canReserve": true,
    "ticketType": {
      "id": "string",
      "name": "string",
      "price": "decimal",
      "maxPerOrder": 4
    }
  }
}
```

**Calculation:**
- `available = totalQuantity - soldQuantity - reservedQuantity`
- `canReserve = available >= requestedQuantity`

#### POST /api/v1/tickets/reserve

Reserve tickets temporarily.

**Request Body:**
```json
{
  "eventId": "string",
  "ticketTypeId": "string",
  "quantity": 2,
  "seatIds": ["string"] // Optional, for seated events
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reservationId": "uuid",
    "expiresAt": "ISO8601",
    "quantity": 2
  }
}
```

**Process:**
1. Validates availability
2. Checks max per order
3. Atomic Redis reservation (Lua script)
4. Creates InventoryReservation record
5. Updates reservedQuantity

**Reservation Expiry:** 10 minutes (configurable)

**Errors:**
- `400` - Insufficient tickets available
- `400` - Exceeds max per order
- `400` - Failed to reserve (Redis error)

#### POST /api/v1/tickets/release

Release a reservation.

**Request Body:**
```json
{
  "reservationId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Reservation released"
}
```

**Process:**
1. Finds reservation
2. Releases from Redis
3. Decrements reservedQuantity
4. Deletes reservation record

### Orders

#### POST /api/v1/orders

Create a new order.

**Request Body:**
```json
{
  "eventId": "string",
  "ticketTypeId": "string",
  "quantity": 2,
  "customerEmail": "string",
  "customerName": "string", // Optional
  "customerPhone": "string", // Optional
  "promoCode": "string", // Optional
  "reservationId": "string" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "string",
    "orderNumber": "string",
    "totalAmount": 5000.00,
    "currency": "NGN"
  }
}
```

**Process:**
1. Validates event and ticket type
2. Calculates subtotal
3. Applies promo code discount (if provided)
4. Calculates platform and processing fees
5. Creates order (PENDING status, or PAID if free)
6. Links reservation to order

**Fee Calculation:**
- Platform fee: `subtotal * platformFeePercent / 100`
- Processing fee: `(subtotal * processingFeePercent / 100) + processingFeeFixed`
- Total: `subtotal + platformFee + processingFee - discountAmount`

**Free Tickets:**
- If `totalAmount = 0`, order status set to PAID automatically

#### GET /api/v1/orders/by-reference/:reference

Get order by Paystack reference.

**Path Parameters:**
- `reference` (string) - Paystack payment reference

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "orderNumber": "string",
    "status": "PAID",
    "totalAmount": 5000.00,
    "currency": "NGN",
    "event": { /* Event object */ },
    "tickets": [ /* Ticket objects */ ]
  }
}
```

#### GET /api/v1/orders/:id

Get order by ID.

**Path Parameters:**
- `id` (string) - Order ID

**Response:** Same as `/by-reference/:reference`

### Payments

#### POST /api/v1/payments/initialize

Initialize Paystack payment.

**Request Body:**
```json
{
  "orderId": "string",
  "email": "string",
  "amount": 5000.00,
  "metadata": {} // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "authorizationUrl": "https://paystack.com/...",
    "accessCode": "string",
    "reference": "TKT-1234567890-ABCDEFGH"
  }
}
```

**Process:**
1. Validates order exists and is PENDING
2. If amount = 0: Auto-marks as PAID, returns mock reference
3. Else: Generates payment reference, initializes Paystack transaction
4. Updates order with payment reference

**Free Tickets:**
- Reference format: `FREE-{timestamp}-{uuid}`
- Auto-marked as PAID
- Skips Paystack API call

#### POST /api/v1/payments/verify

Verify payment status.

**Request Body:**
```json
{
  "reference": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "success",
    "amount": 5000.00,
    "reference": "string"
  }
}
```

**Process:**
1. If reference starts with "FREE-": Auto-verifies
2. Else: Verifies with Paystack API
3. Updates order status to PAID if successful
4. Returns verification result

### Promo Codes

#### POST /api/v1/promo-codes/validate

Validate promo code.

**Request Body:**
```json
{
  "code": "DISCOUNT20",
  "eventId": "string",
  "amount": 5000.00
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "code": "DISCOUNT20",
    "discountType": "PERCENTAGE",
    "discountValue": 20,
    "discountAmount": 1000.00,
    "finalAmount": 4000.00
  }
}
```

**Validation Checks:**
1. Code exists
2. Code is active
3. Within validity dates
4. Event applicability (if event-specific)
5. Minimum order amount
6. Usage limits (max uses, max per user)

**Errors:**
- `404` - Promo code not found
- `400` - Code not active
- `400` - Code expired
- `400` - Not valid for this event
- `400` - Minimum order amount not met
- `400` - Maximum uses reached

### Waitlist

#### POST /api/v1/waitlist

Join event waitlist.

**Request Body:**
```json
{
  "eventId": "string",
  "email": "string",
  "phone": "string", // Optional
  "ticketTypeId": "string", // Optional
  "quantity": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Added to waitlist. You will be notified when tickets become available.",
  "data": {
    "id": "string",
    "eventId": "string",
    "email": "string",
    "ticketTypeId": "string",
    "quantity": 1,
    "createdAt": "ISO8601"
  }
}
```

**Business Rules:**
- One entry per email per event/ticket type
- Duplicate entries return existing entry (no error)

## Authentication Endpoints

### POST /api/v1/auth/register

Register new user.

**Request Body:**
```json
{
  "email": "string",
  "password": "string", // Min 8 characters
  "name": "string", // Optional
  "phone": "string" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "string",
      "email": "string",
      "name": "string",
      "phone": "string",
      "roles": ["BUYER"],
      "createdAt": "ISO8601"
    }
  }
}
```

**Process:**
1. Validates email format and password length
2. Checks if user exists
3. Hashes password (bcrypt, 10 rounds)
4. Creates user with BUYER role
5. Creates BuyerProfile
6. Creates session
7. Sets HTTP-only cookie

**Errors:**
- `400` - User already exists
- `400` - Validation error

### POST /api/v1/auth/login

User login.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "string",
      "email": "string",
      "name": "string",
      "phone": "string",
      "roles": ["BUYER", "ORGANIZER"]
    }
  }
}
```

**Process:**
1. Validates email format
2. Finds user by email
3. Verifies password (bcrypt)
4. Increments failedLoginAttempts on failure
5. Loads roles from UserRole table
6. Creates session
7. Sets HTTP-only cookie
8. Updates lastLoginAt, resets failedLoginAttempts

**Session TTL:**
- Organizers: 2 hours (7200 seconds)
- Buyers: 8 hours (28800 seconds)

**Errors:**
- `401` - Invalid email or password
- `401` - User not found

### POST /api/v1/auth/logout

Logout user.

**Request:** No body required (uses session cookie)

**Response:**
```json
{
  "success": true
}
```

**Process:**
1. Reads session ID from cookie
2. Deletes session from Redis
3. Clears HTTP-only cookie

### GET /api/v1/auth/session

Get current session info.

**Request:** No body required (uses session cookie)

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "string",
    "email": "string",
    "roles": ["BUYER", "ORGANIZER"],
    "activeRole": "buyer",
    "createdAt": 1234567890,
    "lastActivity": 1234567890
  }
}
```

**Errors:**
- `401` - No session found
- `401` - Session expired or invalid

### POST /api/v1/auth/switch-role

Switch active role context (dual-role users).

**Request Body:**
```json
{
  "role": "buyer" // or "organizer"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Role switched successfully"
  }
}
```

**Validation:**
- User must have ORGANIZER role to switch to organizer mode
- Updates activeRole in session

**Errors:**
- `401` - No session found
- `401` - Session expired
- `403` - User does not have ORGANIZER role

### POST /api/v1/auth/request-organizer

Request ORGANIZER role.

**Request:** No body required (uses session cookie)

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "ORGANIZER role granted successfully",
    "roles": ["BUYER", "ORGANIZER"]
  }
}
```

**Process:**
1. Checks if ORGANIZER role already exists
2. Creates UserRole entry (ORGANIZER)
3. Creates/updates OrganizerProfile (onboardingCompleted: false)
4. Updates session with new role
5. Returns updated roles

**Errors:**
- `401` - No session found
- `401` - Session expired

### POST /api/v1/auth/refresh

Refresh JWT token (backward compatibility).

**Request Body:**
```json
{
  "refreshToken": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "string",
    "refreshToken": "string"
  }
}
```

**Note:** This endpoint exists for backward compatibility but is not actively used. Session-based auth is primary.

## Authenticated Endpoints

### Users

#### GET /api/v1/users/me

Get current user information.

**Authentication:** Required (validateSession)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "email": "string",
    "name": "string",
    "phone": "string",
    "roles": ["BUYER", "ORGANIZER"],
    "buyerProfile": { /* BuyerProfile object */ },
    "organizerProfile": { /* OrganizerProfile object */ }
  }
}
```

#### GET /api/v1/users/tickets

Get user's tickets.

**Authentication:** Required (authenticate - supports JWT fallback)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "ticketNumber": "string",
      "status": "VALID",
      "event": { /* Event object */ },
      "ticketType": { /* TicketType object */ },
      "order": { /* Order object */ },
      "seat": { /* Seat object, if seated */ }
    }
  ]
}
```

**Query Logic:**
- Returns tickets where order.userId matches OR order.customerEmail matches

#### GET /api/v1/users/orders

Get user's orders.

**Authentication:** Required (authenticate - supports JWT fallback)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "orderNumber": "string",
      "status": "PAID",
      "totalAmount": 5000.00,
      "currency": "NGN",
      "event": { /* Event object */ },
      "tickets": [ /* Ticket objects */ ],
      "_count": {
        "tickets": 2
      }
    }
  ]
}
```

**Query Logic:**
- Returns orders where userId matches OR customerEmail matches

#### PUT /api/v1/users/me/profile

Update user profile (buyer or organizer).

**Authentication:** Required (validateSession)

**Request Body:**
```json
{
  "buyerProfile": {
    "firstName": "string",
    "lastName": "string",
    "dateOfBirth": "ISO8601", // Optional, nullable
    "address": "string",
    "city": "string",
    "country": "string",
    "preferredPaymentMethod": "string" // Optional, nullable
  },
  "organizerProfile": {
    "businessName": "string",
    "businessType": "string",
    "businessAddress": "string",
    "businessCity": "string",
    "businessCountry": "string",
    "taxId": "string"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* Updated user object */ }
}
```

**Business Rules:**
- Either buyerProfile or organizerProfile can be updated
- organizerProfile.onboardingCompleted set to true if businessName and businessType provided

### Organizer Endpoints

#### GET /api/v1/organizer/events

List organizer's events.

**Authentication:** Required (requireRole: ORGANIZER)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "title": "string",
      "status": "PUBLISHED",
      "ticketTypes": [ /* TicketType objects */ ],
      "_count": {
        "orders": 10,
        "tickets": 25
      }
    }
  ]
}
```

#### GET /api/v1/organizer/events/:id

Get organizer's event details.

**Authentication:** Required (requireRole: ORGANIZER)

**Path Parameters:**
- `id` (string) - Event ID

**Response:**
```json
{
  "success": true,
  "data": { /* Event object with ticket types */ }
}
```

**Validation:**
- Verifies event ownership

#### POST /api/v1/organizer/events

Create new event.

**Authentication:** Required (requireRole: ORGANIZER)

**Request Body:**
```json
{
  "title": "string",
  "description": "string", // Optional
  "category": "string",
  "venueName": "string", // Optional
  "venueAddress": "string", // Optional
  "city": "string",
  "country": "string",
  "startDateTime": "ISO8601",
  "endDateTime": "ISO8601",
  "saleStart": "ISO8601", // Optional
  "saleEnd": "ISO8601", // Optional
  "isSeated": false,
  "isVirtual": false,
  "ticketTypes": [
    {
      "name": "string",
      "description": "string", // Optional
      "price": 5000.00,
      "currency": "NGN",
      "totalQuantity": 100,
      "maxPerOrder": 4,
      "minPerOrder": 1
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* Created event object */ }
}
```

**Process:**
1. Generates unique slug from title
2. Creates event in DRAFT status
3. Creates ticket types
4. Returns created event

#### PUT /api/v1/organizer/events/:id

Update event.

**Authentication:** Required (requireRole: ORGANIZER)

**Path Parameters:**
- `id` (string) - Event ID

**Request Body:** Same as POST, but all fields optional

**Response:**
```json
{
  "success": true,
  "data": { /* Updated event object */ }
}
```

**Process:**
1. Verifies ownership
2. Regenerates slug if title changed
3. Updates event
4. Updates/creates/deletes ticket types as needed

#### PATCH /api/v1/organizer/events/:id/status

Update event status.

**Authentication:** Required (requireRole: ORGANIZER)

**Path Parameters:**
- `id` (string) - Event ID

**Request Body:**
```json
{
  "status": "PUBLISHED" // DRAFT, PUBLISHED, LIVE, SOLD_OUT, CANCELLED, COMPLETED
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* Updated event object */ }
}
```

**Status Transitions:**
- Validates transition (see Business Rules)
- Rejects invalid transitions with 400 error

#### GET /api/v1/organizer/events/:id/analytics

Get event analytics.

**Authentication:** Required (requireRole: ORGANIZER)

**Path Parameters:**
- `id` (string) - Event ID

**Response:**
```json
{
  "success": true,
  "data": {
    "revenue": 500000.00,
    "ticketsSold": 100,
    "ordersCount": 50,
    "ticketTypeStats": [
      {
        "ticketTypeId": "string",
        "name": "string",
        "sold": 50,
        "revenue": 250000.00
      }
    ]
  }
}
```

#### GET /api/v1/organizer/events/:id/seats

List seats for seated event.

**Authentication:** Required (requireRole: ORGANIZER)

**Path Parameters:**
- `id` (string) - Event ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "section": "string",
      "row": "string",
      "number": "string",
      "tier": "string",
      "status": "AVAILABLE"
    }
  ]
}
```

**Validation:**
- Event must be seated (isSeated = true)

#### POST /api/v1/organizer/events/:id/seats

Create seats (bulk).

**Authentication:** Required (requireRole: ORGANIZER)

**Path Parameters:**
- `id` (string) - Event ID

**Request Body:**
```json
{
  "seats": [
    {
      "section": "string",
      "row": "string", // Optional
      "number": "string",
      "tier": "string" // Optional
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": [ /* Created seat objects */ ],
  "message": "Created 100 seats"
}
```

#### PUT /api/v1/organizer/events/:id/seats/:seatId

Update seat status (block/unblock).

**Authentication:** Required (requireRole: ORGANIZER)

**Path Parameters:**
- `id` (string) - Event ID
- `seatId` (string) - Seat ID

**Request Body:**
```json
{
  "status": "BLOCKED" // AVAILABLE or BLOCKED
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* Updated seat object */ }
}
```

**Validation:**
- Cannot block SOLD seats
- Cannot unblock SOLD seats

#### DELETE /api/v1/organizer/events/:id/seats/:seatId

Delete seat.

**Authentication:** Required (requireRole: ORGANIZER)

**Path Parameters:**
- `id` (string) - Event ID
- `seatId` (string) - Seat ID

**Response:**
```json
{
  "success": true,
  "message": "Seat deleted"
}
```

**Validation:**
- Cannot delete SOLD seats

#### GET /api/v1/organizer/events/:id/waitlist

Get event waitlist entries.

**Authentication:** Required (requireRole: ORGANIZER)

**Path Parameters:**
- `id` (string) - Event ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "email": "string",
      "phone": "string",
      "ticketTypeId": "string",
      "quantity": 2,
      "notified": false,
      "createdAt": "ISO8601"
    }
  ]
}
```

#### GET /api/v1/organizer/events/:id/orders

Get event orders.

**Authentication:** Required (requireRole: ORGANIZER)

**Path Parameters:**
- `id` (string) - Event ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "orderNumber": "string",
      "status": "PAID",
      "totalAmount": 5000.00,
      "customerEmail": "string",
      "tickets": [ /* Ticket objects */ ]
    }
  ]
}
```

### Organizer Promo Codes

#### GET /api/v1/organizer/promo-codes

List organizer's promo codes.

**Authentication:** Required (authenticate)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "code": "DISCOUNT20",
      "description": "string",
      "discountType": "PERCENTAGE",
      "discountValue": 20.00,
      "maxUses": 100,
      "currentUses": 5,
      "validFrom": "ISO8601",
      "validUntil": "ISO8601",
      "isActive": true,
      "event": { /* Event object, if event-specific */ }
    }
  ]
}
```

**Logic:**
- Returns global codes (eventId = null) and event-specific codes for organizer's events

#### POST /api/v1/organizer/promo-codes

Create promo code.

**Authentication:** Required (authenticate)

**Request Body:**
```json
{
  "code": "DISCOUNT20",
  "description": "string", // Optional
  "discountType": "PERCENTAGE", // or "FIXED"
  "discountValue": 20.00,
  "maxUses": 100, // Optional
  "maxUsesPerUser": 1,
  "validFrom": "ISO8601",
  "validUntil": "ISO8601",
  "eventId": "string", // Optional (null = global)
  "minOrderAmount": 1000.00, // Optional
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* Created promo code object */ }
}
```

**Validation:**
- Code uniqueness
- Event ownership (if eventId provided)
- Code converted to uppercase

#### GET /api/v1/organizer/promo-codes/:id

Get promo code details.

**Authentication:** Required (authenticate)

**Response:**
```json
{
  "success": true,
  "data": { /* Promo code object */ }
}
```

**Validation:**
- Event ownership verification (if event-specific)

#### PUT /api/v1/organizer/promo-codes/:id

Update promo code.

**Authentication:** Required (authenticate)

**Request Body:** Same as POST, but all fields optional

**Response:**
```json
{
  "success": true,
  "data": { /* Updated promo code object */ }
}
```

**Validation:**
- Event ownership verification
- Code uniqueness (if code changed)

#### DELETE /api/v1/organizer/promo-codes/:id

Delete promo code.

**Authentication:** Required (authenticate)

**Response:**
```json
{
  "success": true,
  "message": "Promo code deleted"
}
```

**Validation:**
- Event ownership verification (if event-specific)

### Ticket Transfer

#### POST /api/v1/tickets/:id/transfer

Transfer ticket to another person.

**Authentication:** Required (authenticate)

**Path Parameters:**
- `id` (string) - Ticket ID

**Request Body:**
```json
{
  "ticketId": "string",
  "recipientEmail": "string",
  "recipientName": "string" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ticket": { /* Updated ticket object */ },
    "message": "Ticket transferred successfully"
  }
}
```

**Process:**
1. Verifies ticket ownership
2. Validates ticket status (must be VALID)
3. Updates ticket with recipient info
4. Sets status to TRANSFERRED
5. Sends email notification to recipient

**Errors:**
- `403` - User does not own ticket
- `400` - Ticket cannot be transferred (invalid status)

## Webhook Endpoints

### POST /api/v1/webhooks/paystack

Paystack webhook handler.

**Headers:**
- `x-paystack-signature` (string, required) - HMAC SHA512 signature

**Request Body:**
```json
{
  "event": "charge.success", // or "charge.failed"
  "data": {
    "reference": "string",
    "status": "success",
    "amount": 500000 // in kobo
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

**Process:**
1. Verifies webhook signature
2. Handles `charge.success`:
   - Finds order by reference
   - Updates order to PAID
   - Generates tickets if not already generated
   - Sends email confirmation
   - Sends SMS confirmation (if phone provided)
3. Handles `charge.failed`:
   - Updates order to FAILED
   - Releases reservations

**Errors:**
- `400` - Missing signature
- `401` - Invalid signature
- `404` - Order not found

## Rate Limiting

**Configuration:**
- Max requests: 100 per minute
- Namespace: `api-rate-limit`
- Storage: Redis
- Skip on error: true (continues if Redis unavailable)

**Implementation:**
- Fastify rate limit plugin
- Applied globally to all routes
- Redis-based (with graceful degradation)

## Error Responses

### Validation Error (400)

```json
{
  "success": false,
  "error": "Validation error",
  "details": {
    "field": ["Error message"]
  }
}
```

### Unauthorized (401)

```json
{
  "success": false,
  "error": "Unauthorized" // or "No session found", "Session expired or invalid"
}
```

### Forbidden (403)

```json
{
  "success": false,
  "error": "Forbidden: User does not have ORGANIZER role"
}
```

### Not Found (404)

```json
{
  "success": false,
  "error": "Event not found" // or "Order not found", etc.
}
```

### Internal Server Error (500)

```json
{
  "success": false,
  "error": "Internal server error"
}
```

## Health Check

### GET /health

Health check endpoint (not under /api/v1).

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "ISO8601",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

**Unhealthy Response (503):**
```json
{
  "status": "unhealthy",
  "timestamp": "ISO8601",
  "error": "Error message"
}
```

**Checks:**
- Database connection (Prisma query)
- Redis connection (ping)
