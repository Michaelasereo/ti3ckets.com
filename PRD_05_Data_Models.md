# PRD 05: Data Models

## Database Schema Overview

The getiickets database uses PostgreSQL with Prisma ORM. The schema is defined in `packages/database/prisma/schema.prisma`.

### Connection Configuration

- **Pooler URL:** Used for application connections (port 6543)
  - Includes `pgbouncer=true` flag to disable prepared statements
  - Connection limit: 1
- **Direct URL:** Used for migrations and seed scripts (port 5432)
  - Direct connection without pooling

## Core Entities

### User

**Table:** `users`

**Fields:**
- `id` (String, CUID) - Primary key
- `email` (String, Unique) - User email
- `phone` (String?, Unique) - User phone number
- `name` (String?) - User display name
- `passwordHash` (String?) - Bcrypt hashed password
- `emailVerified` (Boolean, default: false) - Email verification status
- `emailVerifiedAt` (DateTime?) - Email verification timestamp
- `lastLoginAt` (DateTime?) - Last login timestamp
- `failedLoginAttempts` (Int, default: 0) - Failed login counter
- `accountLockedUntil` (DateTime?) - Account lockout expiration
- `createdAt` (DateTime) - Creation timestamp
- `updatedAt` (DateTime) - Last update timestamp

**Relations:**
- `roles` → UserRole[] (one-to-many)
- `buyerProfile` → BuyerProfile? (one-to-one)
- `organizerProfile` → OrganizerProfile? (one-to-one)
- `events` → Event[] (one-to-many, as organizer)
- `orders` → Order[] (one-to-many, as buyer)

**Business Rules:**
- Email must be unique
- Phone must be unique (if provided)
- All users start with BUYER role by default
- Password hash required for authenticated users

### UserRole

**Table:** `user_roles`

**Fields:**
- `id` (String, CUID) - Primary key
- `userId` (String) - Foreign key to User
- `role` (Role enum) - Role type (BUYER, ORGANIZER, ADMIN)
- `grantedAt` (DateTime, default: now) - Role grant timestamp
- `grantedBy` (String?) - Admin who granted role (optional)

**Unique Constraint:**
- `userId` + `role` (composite unique)

**Relations:**
- `user` → User (many-to-one)

**Business Rules:**
- Users can have multiple roles
- BUYER role is default for all users
- ORGANIZER role can be self-requested
- ADMIN role exists but not actively used

### BuyerProfile

**Table:** `buyer_profiles`

**Fields:**
- `id` (String, CUID) - Primary key
- `userId` (String, Unique) - Foreign key to User
- `firstName` (String?) - First name
- `lastName` (String?) - Last name
- `dateOfBirth` (DateTime?) - Date of birth
- `address` (String?) - Street address
- `city` (String?) - City
- `country` (String?) - Country
- `preferredPaymentMethod` (String?) - Payment preference
- `createdAt` (DateTime) - Creation timestamp
- `updatedAt` (DateTime) - Last update timestamp

**Relations:**
- `user` → User (one-to-one)

**Business Rules:**
- One profile per user
- firstName and lastName required for profile completion
- Other fields optional

### OrganizerProfile

**Table:** `organizer_profiles`

**Fields:**
- `id` (String, CUID) - Primary key
- `userId` (String, Unique) - Foreign key to User
- `businessName` (String) - Business name (required)
- `businessType` (String?) - Business type
- `taxId` (String?) - Tax identification number
- `businessAddress` (String?) - Business address
- `businessCity` (String?) - Business city
- `businessCountry` (String?) - Business country
- `verificationStatus` (OrganizerVerificationStatus, default: PENDING) - Verification status
- `verifiedAt` (DateTime?) - Verification timestamp
- `stripeConnectAccountId` (String?) - Stripe Connect account ID
- `payoutDetails` (Json?) - Payout configuration
- `onboardingCompleted` (Boolean, default: false) - Onboarding completion flag
- `createdAt` (DateTime) - Creation timestamp
- `updatedAt` (DateTime) - Last update timestamp

**Relations:**
- `user` → User (one-to-one)

**Business Rules:**
- One profile per user
- businessName required
- businessName + businessType required for onboarding completion
- verificationStatus: PENDING → VERIFIED/REJECTED/SUSPENDED

### Event

**Table:** `events`

**Fields:**
- `id` (String, CUID) - Primary key
- `organizerId` (String) - Foreign key to User (organizer)
- `title` (String) - Event title
- `slug` (String, Unique) - URL-friendly slug
- `description` (String?, Text) - Event description
- `category` (String) - Event category (concert, conference, sports, etc.)
- `imageUrl` (String?) - Event image URL
- `bannerUrl` (String?) - Event banner URL
- `venueName` (String) - Venue name
- `venueAddress` (String) - Venue address
- `city` (String) - City
- `country` (String, default: "Nigeria") - Country
- `isVirtual` (Boolean, default: false) - Virtual event flag
- `startDateTime` (DateTime) - Event start date/time
- `endDateTime` (DateTime) - Event end date/time
- `timezone` (String, default: "Africa/Lagos") - Timezone
- `saleStart` (DateTime) - Ticket sale start date
- `saleEnd` (DateTime) - Ticket sale end date
- `isSeated` (Boolean, default: false) - Seated event flag
- `status` (EventStatus, default: DRAFT) - Event status
- `createdAt` (DateTime) - Creation timestamp
- `updatedAt` (DateTime) - Last update timestamp

**Indexes:**
- `organizerId` - For organizer event queries
- `startDateTime` - For date-based queries
- `city` - For location-based queries
- `status, saleStart, saleEnd` - For public event listings

**Relations:**
- `organizer` → User (many-to-one)
- `ticketTypes` → TicketType[] (one-to-many)
- `orders` → Order[] (one-to-many)
- `tickets` → Ticket[] (one-to-many)
- `seats` → Seat[] (one-to-many)

**Business Rules:**
- Slug must be unique (auto-generated from title)
- Events created in DRAFT status
- Only PUBLISHED/LIVE events visible to public
- Events must have active sale period to be visible
- endDateTime must be after startDateTime

### TicketType

**Table:** `ticket_types`

**Fields:**
- `id` (String, CUID) - Primary key
- `eventId` (String) - Foreign key to Event
- `name` (String) - Ticket type name
- `description` (String?, Text) - Ticket type description
- `price` (Decimal(10, 2)) - Ticket price
- `currency` (String, default: "NGN") - Currency code
- `totalQuantity` (Int) - Total tickets available
- `soldQuantity` (Int, default: 0) - Tickets sold
- `reservedQuantity` (Int, default: 0) - Tickets reserved
- `maxPerOrder` (Int, default: 4) - Maximum tickets per order
- `minPerOrder` (Int, default: 1) - Minimum tickets per order
- `saleStart` (DateTime?) - Sale start date (optional, overrides event)
- `saleEnd` (DateTime?) - Sale end date (optional, overrides event)
- `createdAt` (DateTime) - Creation timestamp
- `updatedAt` (DateTime) - Last update timestamp

**Indexes:**
- `eventId` - For event ticket type queries

**Relations:**
- `event` → Event (many-to-one)
- `tickets` → Ticket[] (one-to-many)

**Business Rules:**
- At least one ticket type required per event
- Price can be 0 (free tickets)
- Available = totalQuantity - soldQuantity - reservedQuantity
- Cannot delete ticket types with sold tickets (Prisma cascade)

### Seat

**Table:** `seats`

**Fields:**
- `id` (String, CUID) - Primary key
- `eventId` (String) - Foreign key to Event
- `section` (String) - Seat section
- `row` (String?) - Seat row
- `number` (String) - Seat number
- `tier` (String?) - Seat tier (Premium, Standard, etc.)
- `status` (SeatStatus, default: AVAILABLE) - Seat status

**Unique Constraint:**
- `eventId` + `section` + `row` + `number` (composite unique)

**Indexes:**
- `eventId, status` - For seat availability queries

**Relations:**
- `event` → Event (many-to-one)
- `ticket` → Ticket? (one-to-one, optional)

**Business Rules:**
- Only for seated events (isSeated = true)
- Unique seat identification per event
- Status: AVAILABLE → RESERVED → SOLD
- Can be BLOCKED by organizer

### Order

**Table:** `orders`

**Fields:**
- `id` (String, CUID) - Primary key
- `userId` (String?) - Foreign key to User (optional, for guest checkout)
- `eventId` (String) - Foreign key to Event
- `orderNumber` (String, Unique) - Human-readable order number
- `status` (OrderStatus, default: PENDING) - Order status
- `totalAmount` (Decimal(10, 2)) - Total order amount
- `currency` (String, default: "NGN") - Currency code
- `customerEmail` (String) - Customer email (required for guest checkout)
- `customerName` (String?) - Customer name
- `customerPhone` (String?) - Customer phone
- `paymentMethod` (String?) - Payment method used
- `paystackRef` (String?, Unique) - Paystack payment reference
- `paymentStatus` (String?) - Payment status (success, failed, pending)
- `promoCode` (String?) - Applied promo code
- `discountAmount` (Decimal(10, 2)?) - Discount amount applied
- `ipAddress` (String?) - Customer IP address
- `userAgent` (String?) - Customer user agent
- `createdAt` (DateTime) - Creation timestamp
- `updatedAt` (DateTime) - Last update timestamp
- `paidAt` (DateTime?) - Payment completion timestamp

**Indexes:**
- `eventId` - For event order queries
- `userId` - For user order queries
- `createdAt` - For chronological queries
- `paystackRef` - For payment verification

**Relations:**
- `user` → User? (many-to-one, optional)
- `event` → Event (many-to-one)
- `tickets` → Ticket[] (one-to-many)

**Business Rules:**
- Order can be linked to user OR customer email
- Free tickets (totalAmount = 0) auto-marked as PAID
- Order status: PENDING → PAID/FAILED
- paystackRef unique for payment tracking

### Ticket

**Table:** `tickets`

**Fields:**
- `id` (String, CUID) - Primary key
- `orderId` (String) - Foreign key to Order
- `eventId` (String) - Foreign key to Event
- `ticketTypeId` (String) - Foreign key to TicketType
- `seatId` (String?, Unique) - Foreign key to Seat (optional, for seated events)
- `ticketNumber` (String, Unique) - Human-readable ticket number
- `qrCode` (String) - QR code data (JSON string)
- `qrCodeUrl` (String?) - S3 URL for QR code image
- `pdfUrl` (String?) - S3 URL for ticket PDF
- `barcode` (String?) - Barcode data
- `attendeeName` (String?) - Attendee name
- `attendeeEmail` (String?) - Attendee email
- `attendeePhone` (String?) - Attendee phone
- `status` (TicketStatus, default: VALID) - Ticket status
- `checkedInAt` (DateTime?) - Check-in timestamp
- `checkedInBy` (String?) - Check-in operator ID
- `transferredFrom` (String?) - Original owner email
- `transferredAt` (DateTime?) - Transfer timestamp
- `createdAt` (DateTime) - Creation timestamp
- `updatedAt` (DateTime) - Last update timestamp

**Indexes:**
- `eventId` - For event ticket queries
- `orderId` - For order ticket queries
- `ticketNumber` - For ticket lookup

**Relations:**
- `order` → Order (many-to-one)
- `event` → Event (many-to-one)
- `ticketType` → TicketType (many-to-one)
- `seat` → Seat? (one-to-one, optional)

**Business Rules:**
- One ticket per order item (quantity = 1 per ticket record)
- Ticket number must be unique
- Seat assignment optional (only for seated events)
- Status: VALID → USED/CANCELLED/TRANSFERRED

### InventoryReservation

**Table:** `inventory_reservations`

**Fields:**
- `id` (String, CUID) - Primary key
- `eventId` (String) - Foreign key to Event
- `ticketTypeId` (String?) - Foreign key to TicketType
- `quantity` (Int) - Reserved quantity
- `reservationId` (String, Unique) - UUID for reservation
- `expiresAt` (DateTime) - Reservation expiry timestamp
- `orderId` (String?) - Foreign key to Order (linked when order created)

**Indexes:**
- `expiresAt` - For cleanup queries
- `reservationId` - For reservation lookup

**Business Rules:**
- Reservations expire after 10 minutes (configurable)
- Linked to order when order created
- Used for atomic ticket reservation

### PromoCode

**Table:** `promo_codes`

**Fields:**
- `id` (String, CUID) - Primary key
- `code` (String, Unique) - Promo code (uppercase)
- `description` (String?) - Code description
- `discountType` (String) - "PERCENTAGE" or "FIXED"
- `discountValue` (Decimal(10, 2)) - Discount amount or percentage
- `maxUses` (Int?) - Maximum total uses
- `currentUses` (Int, default: 0) - Current usage count
- `maxUsesPerUser` (Int, default: 1) - Maximum uses per user
- `validFrom` (DateTime) - Validity start date
- `validUntil` (DateTime) - Validity end date
- `isActive` (Boolean, default: true) - Active status
- `eventId` (String?) - Foreign key to Event (null = global code)
- `minOrderAmount` (Decimal(10, 2)?) - Minimum order amount
- `createdAt` (DateTime) - Creation timestamp
- `updatedAt` (DateTime) - Last update timestamp

**Indexes:**
- `code, isActive, validFrom, validUntil` - For validation queries

**Relations:**
- `event` → Event? (many-to-one, optional)

**Business Rules:**
- Code must be unique
- Code stored in uppercase
- Global codes (eventId = null) applicable to all events
- Event-specific codes only valid for that event
- Discount cannot exceed order amount

### Waitlist

**Table:** `waitlist`

**Fields:**
- `id` (String, CUID) - Primary key
- `eventId` (String) - Foreign key to Event
- `email` (String) - Customer email
- `phone` (String?) - Customer phone
- `ticketTypeId` (String?) - Foreign key to TicketType (optional)
- `quantity` (Int, default: 1) - Desired quantity
- `notified` (Boolean, default: false) - Notification sent flag
- `notifiedAt` (DateTime?) - Notification timestamp
- `createdAt` (DateTime) - Creation timestamp

**Unique Constraint:**
- `eventId` + `email` + `ticketTypeId` (composite unique)

**Indexes:**
- `eventId, notified` - For notification queries

**Business Rules:**
- One waitlist entry per email per event/ticket type
- Duplicate entries prevented
- Notification tracking for organizer use

## Enums

### Role

```typescript
enum Role {
  BUYER      // Default role for all users
  ORGANIZER  // Event organizer role
  ADMIN      // Administrative role (not actively used)
}
```

### OrganizerVerificationStatus

```typescript
enum OrganizerVerificationStatus {
  PENDING    // Awaiting verification
  VERIFIED   // Verified organizer
  REJECTED   // Verification rejected
  SUSPENDED  // Account suspended
}
```

### EventStatus

```typescript
enum EventStatus {
  DRAFT      // Event being created/edited
  PUBLISHED  // Event visible to public
  LIVE       // Event currently happening
  SOLD_OUT   // All tickets sold
  CANCELLED  // Event cancelled
  COMPLETED  // Event finished
}
```

**Status Transitions:**
- DRAFT → PUBLISHED, CANCELLED
- PUBLISHED → LIVE, CANCELLED, DRAFT
- LIVE → SOLD_OUT, COMPLETED, CANCELLED
- SOLD_OUT → COMPLETED, CANCELLED
- CANCELLED → (terminal)
- COMPLETED → (terminal)

### SeatStatus

```typescript
enum SeatStatus {
  AVAILABLE  // Available for purchase
  RESERVED   // Temporarily reserved
  SOLD       // Sold and assigned
  BLOCKED    // Blocked by organizer
}
```

**Status Flow:**
- AVAILABLE → RESERVED → SOLD
- AVAILABLE → BLOCKED (organizer action)
- BLOCKED → AVAILABLE (organizer action)

### OrderStatus

```typescript
enum OrderStatus {
  PENDING    // Order created, awaiting payment
  PROCESSING // Payment being processed
  PAID       // Payment successful
  FAILED     // Payment failed
  REFUNDED   // Order refunded
  CANCELLED  // Order cancelled
}
```

**Status Flow:**
- PENDING → PROCESSING → PAID/FAILED
- PAID → REFUNDED (if refund processed)
- PENDING → CANCELLED

### TicketStatus

```typescript
enum TicketStatus {
  VALID       // Valid ticket
  USED        // Ticket used/checked in
  CANCELLED   // Ticket cancelled
  TRANSFERRED // Ticket transferred to another person
}
```

**Status Flow:**
- VALID → USED (check-in)
- VALID → CANCELLED (refund/cancellation)
- VALID → TRANSFERRED (transfer action)

## Entity Relationships

### User Relationships

```
User
├── UserRole[] (one-to-many)
│   └── Role: BUYER, ORGANIZER, ADMIN
├── BuyerProfile? (one-to-one)
├── OrganizerProfile? (one-to-one)
├── Event[] (one-to-many, as organizer)
└── Order[] (one-to-many, as buyer)
```

### Event Relationships

```
Event
├── User (organizer, many-to-one)
├── TicketType[] (one-to-many)
│   └── Ticket[] (one-to-many)
├── Order[] (one-to-many)
├── Ticket[] (one-to-many)
└── Seat[] (one-to-many, if isSeated = true)
```

### Order Relationships

```
Order
├── User? (buyer, many-to-one, optional)
├── Event (many-to-one)
├── Ticket[] (one-to-many)
└── InventoryReservation[] (one-to-many, via reservationId)
```

### Ticket Relationships

```
Ticket
├── Order (many-to-one)
├── Event (many-to-one)
├── TicketType (many-to-one)
└── Seat? (one-to-one, optional, if seated event)
```

## Data Validation Rules

### Database-Level Constraints

**Unique Constraints:**
- User.email
- User.phone (if provided)
- Event.slug
- Order.orderNumber
- Order.paystackRef
- Ticket.ticketNumber
- Ticket.seatId (if provided)
- PromoCode.code
- UserRole (userId + role composite)
- Seat (eventId + section + row + number composite)
- Waitlist (eventId + email + ticketTypeId composite)

**Foreign Key Constraints:**
- All foreign keys have `onDelete: Cascade` where appropriate
- UserRole, BuyerProfile, OrganizerProfile cascade on user delete
- TicketType, Seat cascade on event delete
- Ticket cascades on order delete

**Default Values:**
- Event.status: DRAFT
- Event.country: "Nigeria"
- Event.timezone: "Africa/Lagos"
- TicketType.currency: "NGN"
- TicketType.maxPerOrder: 4
- TicketType.minPerOrder: 1
- Order.currency: "NGN"
- Order.status: PENDING
- Seat.status: AVAILABLE
- Ticket.status: VALID
- OrganizerProfile.verificationStatus: PENDING
- OrganizerProfile.onboardingCompleted: false
- User.emailVerified: false
- User.failedLoginAttempts: 0

## Data Integrity Rules

### Business Logic Constraints

1. **Ticket Availability:**
   - `available = totalQuantity - soldQuantity - reservedQuantity`
   - `available >= 0` (enforced by application logic)

2. **Order Amount:**
   - `totalAmount = subtotal + platformFee + processingFee - discountAmount`
   - `totalAmount >= 0` (enforced by application logic)

3. **Promo Code Discount:**
   - `discountAmount <= orderAmount` (enforced by application logic)
   - Percentage: `discountAmount = (orderAmount * discountValue) / 100`
   - Fixed: `discountAmount = discountValue`

4. **Seat Assignment:**
   - Only for seated events (`isSeated = true`)
   - Seat must belong to same event as ticket
   - Seat status must be AVAILABLE or RESERVED when assigned

5. **Reservation Expiry:**
   - Reservations expire after 10 minutes (configurable)
   - Expired reservations should be cleaned up (cron job recommended)

6. **Event Status:**
   - Only PUBLISHED/LIVE events visible to public
   - Events must have active sale period
   - Status transitions validated

## Data Migration Considerations

### RBAC Migration

A migration script exists (`packages/database/prisma/migrate-rbac.js`) that:
- Grants BUYER role to all existing users
- Grants ORGANIZER role to users with existing events
- Creates BuyerProfile and OrganizerProfile as needed

### Future Migrations

When adding new fields:
- Use Prisma migrations (`prisma migrate dev`)
- Use direct connection (DIRECT_URL) for migrations
- Test migrations on staging first
