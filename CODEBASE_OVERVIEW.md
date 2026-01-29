# getiickets Codebase Overview

## Executive Summary

getiickets is a comprehensive ticketing platform built with a modern monorepo architecture. The platform supports event discovery, ticket purchasing, payment processing, and organizer management. The core functionality is production-ready, with some management features still needed for organizers.

**Architecture:** Monorepo (Turbo) with Next.js frontend and Fastify backend
**Database:** PostgreSQL (Supabase) via Prisma ORM
**Key Integrations:** Paystack (payments), Brevo (email), Twilio (SMS), AWS S3 (storage), Redis (caching)

---

## 1. Implemented Features

### Frontend (Next.js)
- ✅ Homepage with hero, featured events, categories
- ✅ Event browsing with filters and search
- ✅ Event detail pages with ticket selection
- ✅ User authentication (login, register, password reset)
- ✅ Checkout flow with Paystack integration
- ✅ Organizer dashboard
- ✅ Event creation (multi-step form)
- ⚠️ User tickets page (UI exists, API missing)

### Backend (Fastify)
- ✅ Event CRUD operations
- ✅ Ticket reservation system (Redis-based)
- ✅ Order management
- ✅ Payment processing (Paystack)
- ✅ Promo code validation
- ✅ Waitlist functionality
- ✅ Ticket transfer
- ✅ Webhook handling
- ✅ Event analytics API

---

## 2. User Roles

### Regular User
- Browse and search events
- Purchase tickets (guest or authenticated)
- View tickets (UI ready, API needed)
- Transfer tickets (API ready, UI needed)
- Join waitlist
- Apply promo codes

### Organizer
- Create events
- View event list
- View analytics (API ready, UI needed)
- Manage events (partially - edit UI missing)

---

## 3. Data Models

**Core Entities:**
- `User` - User accounts (organizers and customers)
- `Event` - Events with venue, timing, status
- `TicketType` - Ticket pricing and inventory
- `Seat` - Seating for seated events
- `Order` - Purchase orders
- `Ticket` - Individual tickets with QR codes
- `PromoCode` - Discount codes
- `Waitlist` - Waitlist entries
- `InventoryReservation` - Temporary ticket reservations

**Key Relationships:**
- User → Events (organizer)
- Event → TicketTypes → Tickets
- Order → Tickets
- Event → Seats (for seated events)

---

## 4. API Endpoints

### Public APIs
- `GET /api/v1/events` - List events (filtered)
- `GET /api/v1/events/search` - Search events
- `GET /api/v1/events/:id` - Get event by ID
- `GET /api/v1/events/slug/:slug` - Get event by slug
- `GET /api/v1/tickets/availability` - Check availability
- `POST /api/v1/tickets/reserve` - Reserve tickets
- `POST /api/v1/orders` - Create order
- `POST /api/v1/payments/initialize` - Initialize payment
- `POST /api/v1/payments/verify` - Verify payment
- `POST /api/v1/promo-codes/validate` - Validate promo code
- `POST /api/v1/waitlist` - Join waitlist
- `POST /api/v1/auth/register` - Register
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token

### Authenticated APIs (Organizer)
- `GET /api/v1/organizer/events` - List organizer's events
- `POST /api/v1/organizer/events` - Create event
- `GET /api/v1/organizer/events/:id/analytics` - Get analytics
- `POST /api/v1/tickets/:id/transfer` - Transfer ticket

### Webhooks
- `POST /api/v1/webhooks/paystack` - Paystack webhook

---

## 5. External Integrations

| Service | Purpose | Status |
|---------|---------|--------|
| **Paystack** | Payment processing | ✅ Integrated |
| **Brevo** | Email notifications | ✅ Integrated |
| **Twilio** | SMS notifications | ✅ Integrated |
| **AWS S3** | File storage (PDFs, images) | ✅ Integrated |
| **Redis** | Caching & reservations | ✅ Integrated |
| **Supabase** | PostgreSQL database | ✅ Integrated |

---

## 6. Missing UI Components

### Critical Missing Pages

1. **Event Management Page** (`/organizer/events/[id]`)
   - Edit event details
   - Update ticket types
   - Publish/unpublish toggle
   - Manage seats

2. **Event Analytics Page** (`/organizer/events/[id]/analytics`)
   - Revenue charts
   - Ticket sales metrics
   - Order statistics

3. **User Tickets API**
   - Backend endpoint: `GET /api/v1/users/tickets`
   - Frontend UI exists but needs API connection

4. **Promo Code Management**
   - Create/edit promo codes
   - View usage statistics

5. **Waitlist Management**
   - View waitlist entries
   - Notify waitlist members

6. **Seat Management**
   - Create/edit seats
   - Upload seat maps
   - Block/unblock seats

7. **Order Management (Organizer)**
   - View all orders for event
   - Process refunds

8. **Check-in Interface**
   - QR code scanner
   - Manual check-in
   - Check-in statistics

9. **Ticket Transfer UI**
   - Transfer ticket form
   - Transfer history

10. **Event Status Management**
    - Status toggle buttons
    - Status change workflow

---

## 7. User Stories Status

### ✅ Fully Implemented (15 stories)
- Browse events
- Search events
- Filter events
- View event details
- Select tickets
- Reserve tickets
- Purchase tickets
- Apply promo codes
- Guest checkout
- Register account
- Login
- Join waitlist (backend)
- Create event
- View my events
- View analytics (backend)

### ⚠️ Partially Implemented (2 stories)
- View my tickets (UI exists, API missing)
- Transfer ticket (API exists, UI missing)

### ❌ Missing (9 stories)
- Edit event
- Publish/unpublish event
- Manage promo codes
- View waitlist (organizer)
- Manage seats
- View orders (organizer)
- Check-in attendees
- Download ticket PDF
- View order history

---

## 8. Technology Stack

**Frontend:**
- Next.js 14 (App Router)
- React
- TypeScript
- Tailwind CSS
- Axios

**Backend:**
- Fastify
- TypeScript
- Prisma ORM
- JWT authentication
- Redis

**Infrastructure:**
- PostgreSQL (Supabase)
- Redis (Upstash)
- AWS S3
- Paystack
- Brevo
- Twilio

---

## 9. Project Structure

```
getiickets/
├── apps/
│   ├── api/          # Fastify backend API
│   └── web/          # Next.js frontend
├── packages/
│   ├── database/     # Prisma schema
│   ├── shared/       # Shared types/utils
│   └── config/       # Configuration
└── scripts/          # Utility scripts
```

---

## 10. Next Steps / Recommendations

### High Priority
1. Implement user tickets API endpoint
2. Create event management/edit page
3. Add event status management UI
4. Build event analytics page

### Medium Priority
5. Create promo code management UI
6. Build waitlist management interface
7. Add seat management UI
8. Create order management page

### Low Priority
9. Build check-in interface
10. Add ticket transfer UI
11. Create order history page
12. Add PDF download functionality

---

## 11. Test Credentials

**Organizer:**
- Email: `organizer@getiickets.com`
- Password: `password123`

**User:**
- Email: `user@getiickets.com`
- Password: `password123`

---

## 12. Key Files Reference

### Frontend Pages
- `apps/web/app/page.tsx` - Homepage
- `apps/web/app/events/page.tsx` - Event listing
- `apps/web/app/events/[slug]/page.tsx` - Event details
- `apps/web/app/organizer/dashboard/page.tsx` - Organizer dashboard
- `apps/web/app/organizer/events/create/page.tsx` - Create event

### Backend Routes
- `apps/api/src/routes/events.ts` - Event endpoints
- `apps/api/src/routes/organizer.ts` - Organizer endpoints
- `apps/api/src/routes/orders.ts` - Order endpoints
- `apps/api/src/routes/payments.ts` - Payment endpoints

### Database Schema
- `packages/database/prisma/schema.prisma` - Prisma schema

---

*Last Updated: Based on codebase analysis*
*For detailed implementation status, see the full plan document.*
