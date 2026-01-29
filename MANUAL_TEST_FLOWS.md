# Manual Test Flows (6 Core User Stories)

This document describes **manual**, step-by-step QA flows for the six major user stories:

1. Buyer: Guest checkout purchase
2. Buyer: Registered buyer (register + onboarding + purchase + dashboard)
3. Organizer: Request organizer + onboarding + create/publish event
4. Organizer: Ops (orders + check-in)
5. Organizer: Payouts (setup bank + request payout + status)
6. Admin: Admin dashboard (users/events/orders/organizers)

## Preconditions (recommended)

- **API** is running and reachable from the web app (via `apps/web` proxy or `NEXT_PUBLIC_API_URL`).
- **`API_URL`** in `apps/web/.env.local` (e.g. `http://localhost:8080`) so register/login proxy to the API. This ensures verification emails are sent (Brevo); without it, the Next.js fallback is used and no verification email is sent.
- **Paystack test keys** are configured:
  - Backend: `apps/api/.env` has `PAYSTACK_SECRET_KEY=sk_test_...`
  - Frontend: `apps/web/.env.local` has `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...`
- Email/SMS are optional (if Brevo/Twilio are not configured, verify UI and DB-side results instead).

## 1) Buyer: Guest checkout purchase

### Goal (Buyer guest)

Guest user purchases tickets, completes payment, receives confirmation, and can access tickets/order details.

### Steps (Buyer guest)

- **Browse events**
  - Go to `/events`
  - Open any event details page `/events/[slug]`
- **Select tickets**
  - Choose a ticket type and quantity (or seats if the event is seated)
  - Continue to checkout (Step 1 / Step 2 depending on UI)
- **Checkout**
  - Enter customer email, name, and phone
  - Confirm totals (fees, discounts if any)
- **Payment**
  - Complete Paystack test payment
  - Confirm redirect to success page (e.g. `/checkout/success`)

### Expected results (Buyer guest)

- A new **Order** exists with `status=PAID` and `paymentStatus=success`.
- Tickets are generated and visible on the success page.
- Email/SMS sent if configured (otherwise logs show send attempts).

## 2) Buyer: Registered buyer (register + onboarding + purchase + dashboard)

### Goal (Buyer registered)

User registers, completes onboarding, purchases tickets, and sees tickets/orders in dashboard.

### Steps (Buyer registered)

- **Register**
  - Go to `/auth/register`
  - Complete registration steps and submit
- **Verify email (if enabled)**
  - Go to `/auth/verify-email?email=...`
  - Enter verification code and continue
- **Buyer onboarding**
  - Complete required fields (first/last name)
  - Submit → should land on `/dashboard/tickets`
- **Purchase**
  - Repeat flow from story (1), but while logged in
- **Dashboard verification**
  - Check `/dashboard/tickets` and `/dashboard/orders`

### Expected results (Buyer registered)

- User has role `BUYER`.
- Buyer profile required fields are set.
- Orders/tickets appear under the dashboard pages.

## 3) Organizer: Request organizer + onboarding + create/publish event

### Goal (Organizer onboarding and event)

Buyer upgrades to organizer, completes organizer profile, creates an event and publishes it.

### Steps (Organizer onboarding and event)

- **Request organizer role**
  - While logged in as a buyer, open `/organizer/signup`
  - Click “Request Organizer Access”
  - Confirm redirect to `/onboarding/organizer`
- **Organizer onboarding**
  - Fill required business fields (business name + type)
  - Submit → should land on `/organizer/dashboard`
- **Create event**
  - Go to `/organizer/events/create`
  - Complete all steps (basic info, venue/virtual, schedule, tickets)
  - Submit
- **Publish**
  - If the UI supports it: publish the event (status `PUBLISHED`)
  - If seated: configure seats before publishing (publishing should be blocked until seats exist)

### Expected results (Organizer onboarding and event)

- User has role `ORGANIZER`.
- OrganizerProfile `onboardingCompleted=true`.
- New Event exists, with correct dates and sale windows validated.
- Published event is visible in `/events` and accessible at `/events/[slug]`.

## 4) Organizer: Ops (orders + check-in)

### Goal (Organizer ops)

Organizer sees orders for an event and can check in tickets.

### Steps (Organizer ops)

- **Get orders**
  - Go to `/organizer/events/[id]/orders`
  - Confirm orders list loads (empty state is OK if none yet)
- **Create an order**
  - Have a buyer purchase tickets for that event (use story 1 or 2)
- **Verify organizer sees it**
  - Refresh organizer orders page
- **Check-in**
  - Go to `/organizer/events/[id]/check-in`
  - Check in using ticket number (or QR payload if supported)

### Expected results (Organizer ops)

- Organizer orders list includes the new order.
- Check-in updates ticket status to `USED` and sets `checkedInAt`.

## 5) Organizer: Payouts (setup bank + request payout + status)

### Goal (Organizer payouts)

Organizer configures payout bank details and submits a payout request; payout status transitions properly.

### Steps (Organizer payouts)

- **Setup bank account**
  - Go to `/organizer/payouts/setup`
  - Enter bank details and submit
- **Confirm balances**
  - Go to `/organizer/payouts`
  - Confirm `availableBalance` is sufficient (>= ₦10,000)
- **Request payout**
  - Click “Request Payout”
  - Enter amount within available balance and submit
- **Status updates**
  - Go to `/organizer/payouts/history`
  - Confirm payout appears and status progresses

### Expected results (Organizer payouts)

- OrganizerProfile has `payoutDetails.recipientCode`.
- Payout record is created (`PENDING` → `PROCESSING` after transfer initiation).
- With Paystack transfer webhooks enabled, payout ends in `COMPLETED` or `FAILED`.

## 6) Admin: Admin dashboard (users/events/orders/organizers)

### Goal (Admin)

Admin can access dashboard and perform basic moderation/management tasks.

### Steps (Admin)

- **Login as admin**
  - Use your admin login mechanism (route/UI depends on your setup)
  - Navigate to `/admin/dashboard`
- **Review users/events/orders**
  - Open the relevant admin pages from the UI
- **Organizer verification/moderation (if applicable)**
  - Verify organizer review actions and status changes

### Expected results (Admin)

- Admin pages load without unauthorized errors for admin users.
- Lists (users/events/orders/organizers) render and actions succeed with proper server responses.
