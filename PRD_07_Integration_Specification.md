# PRD 07: Integration Specification

## Overview

getiickets integrates with multiple external services for payment processing, notifications, file storage, caching, and database management.

## Payment Integration: Paystack

### Service Details

**Provider:** Paystack
**API Base URL:** `https://api.paystack.co`
**Implementation:** `apps/api/src/services/paystack.ts`

### Configuration

**Environment Variables:**
- `PAYSTACK_SECRET_KEY` - Secret key for API authentication
- `PAYSTACK_PUBLIC_KEY` - Public key (not currently used in backend)

### API Endpoints Used

#### 1. Initialize Transaction

**Endpoint:** `POST /transaction/initialize`

**Request:**
```typescript
{
  email: string;
  amount: number; // in kobo (multiply by 100)
  reference: string;
  metadata: {
    orderId: string;
    eventId: string;
    [key: string]: any;
  };
  callback_url: string;
}
```

**Response:**
```json
{
  "status": true,
  "message": "Authorization URL created",
  "data": {
    "authorization_url": "https://paystack.com/...",
    "access_code": "string",
    "reference": "string"
  }
}
```

**Usage:**
- Called from `POST /api/v1/payments/initialize`
- Amount converted from NGN to kobo (multiply by 100)
- Reference format: `TKT-{timestamp}-{uuid}`

#### 2. Verify Transaction

**Endpoint:** `GET /transaction/verify/:reference`

**Response:**
```json
{
  "status": true,
  "message": "Verification successful",
  "data": {
    "status": "success",
    "amount": 500000, // in kobo
    "reference": "string",
    "customer": { ... },
    "authorization": { ... }
  }
}
```

**Usage:**
- Called from `POST /api/v1/payments/verify`
- Amount converted from kobo to NGN (divide by 100)

### Webhook Integration

**Endpoint:** `POST /api/v1/webhooks/paystack`

**Signature Verification:**
- Header: `x-paystack-signature`
- Method: HMAC SHA512
- Secret: `PAYSTACK_SECRET_KEY`

**Webhook Events Handled:**

1. **charge.success**
   - Updates order status to PAID
   - Generates tickets
   - Sends email/SMS confirmations

2. **charge.failed**
   - Updates order status to FAILED
   - Releases ticket reservations

**Webhook Payload:**
```json
{
  "event": "charge.success",
  "data": {
    "reference": "string",
    "status": "success",
    "amount": 500000
  }
}
```

### Error Handling

**Implemented:**
- Try-catch blocks around API calls
- Error logging
- Graceful error messages

**Missing:**
- Retry logic for transient failures
- Webhook retry queue
- Payment timeout handling

### Business Rules

- Free tickets (amount = 0) skip Paystack entirely
- Payment references are unique per order
- Webhook processing is idempotent (checks order status)

## Email Integration: Brevo

### Service Details

**Provider:** Brevo (formerly Sendinblue)
**API Base URL:** `https://api.brevo.com/v3`
**Implementation:** `apps/api/src/services/brevo.ts`

### Configuration

**Environment Variables:**
- `BREVO_API_KEY` - API key for authentication
- `BREVO_SENDER_EMAIL` - Sender email address
- `BREVO_SENDER_NAME` - Sender display name

### API Endpoints Used

#### Send Transactional Email

**Endpoint:** `POST /smtp/email`

**Request:**
```json
{
  "sender": {
    "name": "getiickets",
    "email": "noreply@getiickets.com"
  },
  "to": [
    {
      "email": "customer@example.com",
      "name": "Customer Name"
    }
  ],
  "subject": "Your Tickets for Event Name",
  "htmlContent": "<html>...</html>",
  "attachments": [
    {
      "name": "ticket-123.pdf",
      "url": "https://s3.amazonaws.com/..."
    }
  ]
}
```

**Usage:**
- Called after successful payment
- Sends ticket confirmation email
- Includes ticket PDF attachments (if available)

### Email Templates

**Ticket Confirmation Email:**
- Subject: "Your Tickets for {eventTitle}"
- Content: HTML with event details, order info, ticket links
- Attachments: Ticket PDFs (if generated)

### Error Handling

**Implemented:**
- API key check (logs warning if not configured)
- Try-catch blocks
- Error logging

**Missing:**
- Retry logic
- Email queue for failed sends
- Template management system

### Graceful Degradation

- If API key not configured: Logs warning, continues without sending
- Email failures don't block order processing

## SMS Integration: Twilio

### Service Details

**Provider:** Twilio
**SDK:** `twilio` npm package
**Implementation:** `apps/api/src/services/twilio.ts`

### Configuration

**Environment Variables:**
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_PHONE_NUMBER` - Twilio phone number

### SMS Sending

**Method:** `client.messages.create()`

**Request:**
```typescript
{
  body: string;
  from: string; // TWILIO_PHONE_NUMBER
  to: string; // Customer phone number
}
```

**Usage:**
- Called after successful payment (if customer phone provided)
- Sends ticket confirmation SMS
- Message: "Your tickets are ready! Order: {orderNumber}. Check your email for ticket PDFs. - getiickets"

### Error Handling

**Implemented:**
- Client initialization check
- Try-catch blocks
- Error logging

**Missing:**
- Retry logic
- SMS queue for failed sends
- Delivery status tracking

### Graceful Degradation

- If not configured: Logs warning, continues without sending
- SMS failures don't block order processing

## File Storage Integration: AWS S3

### Service Details

**Provider:** AWS S3
**SDK:** `@aws-sdk/client-s3`
**Implementation:** `apps/api/src/services/s3.ts`

### Configuration

**Environment Variables:**
- `AWS_REGION` - AWS region (default: us-east-2)
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_S3_BUCKET` - S3 bucket name
- `AWS_CLOUDFRONT_URL` - CloudFront distribution URL (optional)

### Operations

#### Upload File

**Method:** `uploadFile(key: string, buffer: Buffer, contentType: string)`

**Process:**
1. Creates PutObjectCommand
2. Sets ACL to 'public-read'
3. Uploads to S3
4. Returns CloudFront URL (if configured) or S3 URL

**Usage:**
- QR code images: `tickets/{orderId}/{ticketNumber}-qr.png`
- Ticket PDFs: `tickets/{orderId}/{ticketNumber}.pdf`
- Event images: (if implemented)

### File Types Stored

1. **QR Code Images**
   - Format: PNG
   - Content-Type: `image/png`
   - Size: 300x300 pixels
   - Error correction: High (H)

2. **Ticket PDFs**
   - Format: PDF
   - Content-Type: `application/pdf`
   - Size: 400x600 points
   - Contains: Event details, ticket number, QR code reference

### Error Handling

**Current:**
- Basic error handling in upload method
- Errors thrown to caller

**Missing:**
- Retry logic for transient failures
- Upload progress tracking
- File size validation
- Content type validation

### Security Considerations

**Current:**
- Files set to `public-read` ACL
- CloudFront URL support (if configured)

**Recommendations:**
- Use CloudFront signed URLs for better security
- Implement file access controls
- Add virus scanning for uploads

## Caching Integration: Redis (Upstash)

### Service Details

**Provider:** Upstash Redis
**Client:** `ioredis`
**Implementation:** `apps/api/src/services/redis.ts`

### Configuration

**Environment Variable:**
- `REDIS_URL` - Redis connection URL
  - Format: `redis://default:{password}@{endpoint}.upstash.io:6379`

### Connection Configuration

```typescript
{
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  lazyConnect: true,
  connectTimeout: 5000,
  commandTimeout: 3000,
  reconnectOnError: (err) => err.message.includes('READONLY')
}
```

### Use Cases

#### 1. Session Storage

**Key Format:** `sess:{sessionId}`
**Value:** JSON stringified SessionData
**TTL:** 7200 seconds (organizers) or 28800 seconds (buyers)

**Operations:**
- `SET` with TTL
- `GET`
- `DEL` (on logout)

**Fallback:** In-memory storage for development

#### 2. Event Caching

**Event List Cache:**
- Key: `events:{category}:{city}:{date}:{page}:{limit}`
- TTL: 5 minutes (300 seconds)
- Value: JSON stringified event list response

**Event Detail Cache:**
- Key: `event:slug:{slug}` or `event:{id}`
- TTL: 1 minute (60 seconds)
- Value: JSON stringified event object

**Operations:**
- `GET` with 1-second timeout
- `SET` with TTL
- Graceful degradation if Redis unavailable

#### 3. Ticket Reservations

**Atomic Reservation:**
- Key: `ticket:{ticketTypeId}:available`
- Reservation Key: `reservation:{reservationId}`
- Method: Lua script for atomicity

**Lua Script (Reserve):**
```lua
local current = redis.call('GET', KEYS[1])
if current and tonumber(current) >= tonumber(ARGV[1]) then
  redis.call('DECRBY', KEYS[1], ARGV[1])
  redis.call('SETEX', KEYS[2], ARGV[2], ARGV[1])
  return 1
else
  return 0
end
```

**Lua Script (Release):**
```lua
local reserved = redis.call('GET', KEYS[2])
if reserved and tonumber(reserved) > 0 then
  redis.call('INCRBY', KEYS[1], ARGV[1])
  redis.call('DEL', KEYS[2])
end
```

### Error Handling

**Implemented:**
- Timeout protection (1-2 seconds for operations)
- Connection status checks
- Automatic reconnection
- In-memory fallback for development

**Missing:**
- Cache invalidation strategy
- Cache warming on startup
- Cache hit/miss metrics

### Resilience Features

1. **Offline Queue:** Enabled to queue commands when disconnected
2. **Reconnect Strategy:** Exponential backoff (max 2 seconds)
3. **Timeout Protection:** Operations timeout after 1-3 seconds
4. **Development Fallback:** In-memory storage when Redis unavailable

## Database Integration: Supabase PostgreSQL

### Service Details

**Provider:** Supabase (PostgreSQL)
**ORM:** Prisma
**Implementation:** `apps/api/src/plugins/prisma.ts`

### Connection Configuration

**Pooler Connection (Application):**
- URL: `postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`
- Port: 6543
- Purpose: Application queries
- Features: Connection pooling, prepared statements disabled

**Direct Connection (Migrations):**
- URL: `postgresql://...@db.supabase.co:5432/postgres`
- Port: 5432
- Purpose: Migrations and seed scripts
- Features: Direct connection, prepared statements enabled

### Prisma Configuration

**Schema Location:** `packages/database/prisma/schema.prisma`

**Client Initialization:**
```typescript
new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['warn', 'error'],
})
```

**Lifecycle Management:**
- Connect on Fastify startup
- Disconnect on Fastify shutdown
- Health check via `$queryRaw`

### Connection Pooling

**Supabase PgBouncer:**
- Transaction pooling mode
- `pgbouncer=true` flag disables prepared statements
- `connection_limit=1` prevents connection exhaustion

**Why This Configuration:**
- Prevents "prepared statement already exists" errors
- Allows connection reuse
- Optimized for serverless/high-concurrency scenarios

### Error Handling

**Implemented:**
- Connection retry in Prisma client
- Health check with try-catch
- Graceful error logging

**Missing:**
- Connection pool monitoring
- Query timeout configuration
- Dead connection detection

## Integration Status Summary

| Integration | Status | Critical | Fallback | Retry Logic |
|------------|--------|----------|-----------|-------------|
| **Paystack** | ✅ Implemented | Yes | No | ❌ Missing |
| **Brevo** | ✅ Implemented | No | Yes (skip) | ❌ Missing |
| **Twilio** | ✅ Implemented | No | Yes (skip) | ❌ Missing |
| **AWS S3** | ✅ Implemented | Yes | No | ❌ Missing |
| **Redis** | ✅ Implemented | Yes* | Yes (in-memory) | ✅ Implemented |
| **Supabase** | ✅ Implemented | Yes | No | ✅ Implemented |

*Critical for sessions and reservations, but has in-memory fallback for development

## Integration Dependencies

### Critical Dependencies

1. **Paystack** - Required for payment processing
   - Without it: Orders cannot be paid
   - Mitigation: Free tickets work without Paystack

2. **Supabase** - Required for all data storage
   - Without it: Application cannot function
   - Mitigation: None (critical dependency)

3. **Redis** - Required for sessions and reservations
   - Without it: Sessions fail, reservations fail
   - Mitigation: In-memory fallback for development only

### Non-Critical Dependencies

1. **Brevo** - Email notifications
   - Without it: Emails not sent, but orders still process
   - Mitigation: Graceful degradation (logs warning)

2. **Twilio** - SMS notifications
   - Without it: SMS not sent, but orders still process
   - Mitigation: Graceful degradation (logs warning)

3. **AWS S3** - File storage
   - Without it: QR codes and PDFs not stored
   - Mitigation: None (would cause errors)

## Integration Error Handling Patterns

### Pattern 1: Graceful Degradation (Brevo, Twilio)

```typescript
if (!this.apiKey) {
  console.warn('Service not configured, skipping');
  return; // Continue without sending
}
```

### Pattern 2: Timeout Protection (Redis)

```typescript
await Promise.race([
  redisOperation,
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout')), 2000)
  )
]);
```

### Pattern 3: Try-Catch with Logging (All Services)

```typescript
try {
  await serviceCall();
} catch (error) {
  console.error('Service error:', error);
  // Handle or rethrow
}
```

## Integration Testing Considerations

### Test Scenarios

1. **Paystack:**
   - Successful payment
   - Failed payment
   - Webhook signature verification
   - Duplicate webhooks

2. **Brevo:**
   - Email send success
   - API key missing
   - API failure

3. **Twilio:**
   - SMS send success
   - Credentials missing
   - API failure

4. **S3:**
   - File upload success
   - Upload failure
   - Large file handling

5. **Redis:**
   - Connection success
   - Connection failure
   - Timeout scenarios
   - In-memory fallback

6. **Supabase:**
   - Connection success
   - Connection failure
   - Prepared statement errors
   - Connection pool exhaustion

## Integration Monitoring Recommendations

### Metrics to Track

1. **Paystack:**
   - Payment success rate
   - Payment failure rate
   - Average payment processing time
   - Webhook delivery success rate

2. **Brevo:**
   - Email send success rate
   - Email delivery rate
   - Email bounce rate

3. **Twilio:**
   - SMS send success rate
   - SMS delivery rate

4. **S3:**
   - Upload success rate
   - Upload latency
   - Storage usage

5. **Redis:**
   - Connection health
   - Cache hit rate
   - Operation latency
   - Timeout frequency

6. **Supabase:**
   - Connection pool usage
   - Query latency
   - Connection errors

### Alerting Recommendations

- Paystack API failures
- Redis connection failures
- Database connection failures
- S3 upload failures
- High email/SMS failure rates
