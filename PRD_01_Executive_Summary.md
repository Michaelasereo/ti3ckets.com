# PRD 01: Executive Summary

## Product Overview

**getiickets** is a comprehensive event ticketing platform designed for the African market, specifically Nigeria. The platform enables event organizers to create, manage, and sell tickets for various event types (concerts, conferences, sports, festivals, etc.) while providing buyers with a seamless ticket purchasing experience.

### Core Value Proposition

- **For Organizers:** Complete event management solution with ticket sales, analytics, and attendee management
- **For Buyers:** Easy event discovery, secure ticket purchasing, and digital ticket management

## Current State Assessment

### Architecture

- **Monorepo Structure:** Turbo-managed monorepo with separate apps for frontend and backend
- **Frontend:** Next.js 14 (App Router) with React, TypeScript, Tailwind CSS
- **Backend:** Fastify API server with TypeScript
- **Database:** PostgreSQL (Supabase) via Prisma ORM
- **Caching/Sessions:** Redis (Upstash) with in-memory fallback for development

### Implementation Status Summary

#### ✅ Fully Implemented (Core Features)

**Authentication & Authorization:**
- Unified authentication system (single sign-in for all users)
- Role-based access control (RBAC) with BUYER, ORGANIZER, ADMIN roles
- Session management with HTTP-only cookies
- Role switching for dual-role users
- Onboarding flows for buyers and organizers

**Event Management:**
- Event creation (multi-step form)
- Event listing and search
- Event detail pages with ticket selection
- Seat selection for seated events
- Event status management (DRAFT, PUBLISHED, LIVE, SOLD_OUT, CANCELLED, COMPLETED)

**Ticket Purchasing:**
- Ticket reservation system (Redis-based atomic operations)
- Seat selection for seated events
- Checkout flow with Paystack integration
- Guest checkout support
- Promo code validation and application
- Waitlist functionality

**Payment Processing:**
- Paystack integration for payment processing
- Payment verification
- Webhook handling for payment events
- Free ticket support (auto-mark as PAID)

**Organizer Features:**
- Organizer dashboard
- Event analytics API
- Promo code management (CRUD operations)
- Event management APIs

**User Features:**
- User registration and login
- Profile management (buyer and organizer profiles)
- Order history API
- Ticket viewing API

#### ⚠️ Partially Implemented

1. **User Tickets Viewing**
   - ✅ Frontend UI exists (`/dashboard/tickets`)
   - ✅ Backend API exists (`GET /api/v1/users/tickets`)
   - ⚠️ Status: Fully implemented but may need UI polish

2. **Event Editing**
   - ✅ Backend API exists (`PUT /api/v1/organizer/events/:id`)
   - ✅ Frontend UI exists (`/organizer/events/[id]/page.tsx`)
   - ⚠️ Status: Implementation complete, may need testing

3. **Event Analytics**
   - ✅ Backend API exists (`GET /api/v1/organizer/events/:id/analytics`)
   - ⚠️ Frontend UI exists but may be incomplete (`/organizer/events/[id]/analytics/page.tsx`)

4. **Ticket Transfer**
   - ✅ Backend API exists (`POST /api/v1/tickets/:id/transfer`)
   - ⚠️ Frontend UI component exists (`TransferTicketModal.tsx`) but may not be integrated

#### ❌ Missing Features

1. **Event Status Management UI**
   - Backend API exists for status updates
   - Missing: UI controls for status changes (publish/unpublish buttons)

2. **Waitlist Management (Organizer)**
   - Backend: Waitlist entries can be created
   - Missing: UI to view waitlist entries, notify waitlist members

3. **Seat Management (Organizer)**
   - Backend API exists (`GET /api/v1/organizer/events/:id/seats`, `POST /api/v1/organizer/events/:id/seats`)
   - Missing: UI for creating/editing seats, uploading seat maps, blocking seats

4. **Order Management (Organizer)**
   - Missing: UI to view all orders for an event
   - Missing: Refund processing UI

5. **Check-in Interface**
   - Missing: QR code scanner
   - Missing: Manual check-in interface
   - Missing: Check-in statistics

6. **Ticket PDF Download**
   - Missing: PDF generation and download functionality
   - Note: PDF service exists (`apps/api/src/services/pdf.ts`) but may not be fully integrated

7. **Order History UI**
   - Backend API exists (`GET /api/v1/users/orders`)
   - Missing: Frontend page to display order history

## Key Metrics & Goals

### Current Capabilities

- **Event Types Supported:** All categories (concert, conference, sports, festival, etc.)
- **Payment Methods:** Paystack (cards, bank transfers, mobile money)
- **Ticket Types:** Multiple ticket types per event with pricing tiers
- **Seating:** Support for both general admission and seated events
- **User Roles:** BUYER, ORGANIZER, ADMIN with dual-role support
- **Guest Checkout:** Supported (no account required)

### Technical Metrics

- **API Response Times:** Cached event listings (5 min TTL), event details (1 min TTL)
- **Session Management:** 8-hour sessions for buyers, 2-hour sessions for organizers
- **Reservation System:** 10-minute reservation expiry (configurable)
- **Database:** PostgreSQL with connection pooling (Supabase)
- **Caching:** Redis with in-memory fallback for development

## External Integrations

| Service | Purpose | Status | Notes |
|---------|---------|--------|-------|
| **Paystack** | Payment processing | ✅ Integrated | Handles all payment transactions |
| **Brevo** | Email notifications | ✅ Integrated | Ticket confirmations, notifications |
| **Twilio** | SMS notifications | ✅ Integrated | Ticket confirmation SMS |
| **AWS S3** | File storage | ✅ Integrated | QR codes, ticket PDFs, event images |
| **Redis (Upstash)** | Caching & reservations | ✅ Integrated | With in-memory fallback |
| **Supabase** | PostgreSQL database | ✅ Integrated | With connection pooling |

## Technology Stack

### Frontend
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Axios for API calls

### Backend
- Fastify (high-performance web framework)
- TypeScript
- Prisma ORM
- Zod for validation
- bcryptjs for password hashing

### Infrastructure
- PostgreSQL (Supabase)
- Redis (Upstash)
- AWS S3
- Paystack API
- Brevo API
- Twilio API

## Key Differentiators

1. **Unified Authentication:** Single sign-in system with role-based access and role switching
2. **Dual-Role Support:** Users can be both buyers and organizers with seamless role switching
3. **Guest Checkout:** No account required for ticket purchases
4. **Seated Events:** Full support for seat selection and management
5. **Reservation System:** Atomic ticket reservations using Redis to prevent overselling
6. **African Market Focus:** Paystack integration, NGN currency, Nigeria-focused

## Next Steps & Priorities

### High Priority (Critical for Launch)
1. Complete event status management UI
2. Implement check-in interface for organizers
3. Add order management UI for organizers
4. Complete ticket PDF generation and download

### Medium Priority (Important Features)
5. Waitlist management UI
6. Seat management UI improvements
7. Order history UI for buyers
8. Ticket transfer UI integration

### Low Priority (Nice to Have)
9. Advanced analytics visualizations
10. Bulk operations for organizers
11. Email template customization
12. Multi-currency support

## Risk Assessment

### High Risk Areas
1. **Redis Dependency:** Session management and reservations depend on Redis. Mitigation: In-memory fallback for development.
2. **Payment Processing:** Critical dependency on Paystack. Mitigation: Webhook verification, proper error handling.
3. **Database Connection Pooling:** Supabase PgBouncer requires careful Prisma configuration. Mitigation: Using pooler with `pgbouncer=true` flag.

### Medium Risk Areas
1. **Concurrent Ticket Reservations:** Redis-based atomic operations mitigate race conditions.
2. **Session Expiry:** Proper session timeout handling implemented.
3. **Email/SMS Delivery:** Services gracefully degrade if APIs are unavailable.

## Assumptions

1. All users start with BUYER role by default
2. Organizers must request ORGANIZER role (self-service)
3. Guest checkout is supported (no account required)
4. Free tickets are automatically marked as PAID
5. Event status transitions follow: DRAFT → PUBLISHED → LIVE → SOLD_OUT/COMPLETED/CANCELLED
6. Ticket reservations expire after 10 minutes (configurable)
7. Platform fees and processing fees are calculated on paid tickets only

## Document Status

- **Last Updated:** January 24, 2026
- **Version:** 1.0
- **Status:** Comprehensive analysis of existing codebase
