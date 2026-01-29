# Environment Variables Guide

This document lists all environment variables required for the getiickets platform.

## Backend API (`apps/api/.env`)

### 🔴 Required (Critical)

#### Database (Supabase)
```bash
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres?pgbouncer=true"
```
- **Description**: Supabase PostgreSQL connection strings
- **Format**: 
  - `DATABASE_URL`: Connection pooler URL (for Prisma Client)
  - `DIRECT_URL`: Direct connection URL (for migrations)
- **Required for**: All database operations
- **Get from**: Supabase Dashboard → Project Settings → Database
- **Setup Guide**: See `SUPABASE_SETUP.md`
- **Connection pool**: If using the Supabase pooler URL (e.g. `...pooler.supabase.com:6543/...?pgbouncer=true&connection_limit=1`), the API runs organizer analytics and other multi-query routes sequentially to avoid pool timeouts. For higher concurrency you can increase `connection_limit` (e.g. `connection_limit=5`) in the pooler URL.
- **"Can't reach database server"**: If you see this for the direct host (port 5432), the app can still work with the **pooler** (port 6543). Set `DATABASE_URL` to the pooler URL. See [DATABASE_CONNECTION.md](./DATABASE_CONNECTION.md).

#### Redis (Upstash)
```bash
REDIS_URL="redis://default:[PASSWORD]@[ENDPOINT].upstash.io:6379"
# Or with TLS:
REDIS_URL="rediss://default:[PASSWORD]@[ENDPOINT].upstash.io:6379"
```
- **Description**: Upstash Redis connection URL for caching and ticket reservations
- **Format**: `redis://default:password@endpoint.upstash.io:6379` or `rediss://` for TLS
- **Required for**: Caching, rate limiting, atomic ticket reservations
- **Get from**: Upstash Dashboard → Your Database → REST API → Redis URL
- **Setup Guide**: See `UPSTASH_SETUP.md`
- **Free Tier**: 10,000 commands/day

#### JWT Authentication
```bash
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
```
- **Description**: Secret key for signing JWT tokens
- **Required for**: User authentication, protected routes
- **⚠️ Security**: Use a strong, random string (minimum 32 characters)

#### Paystack (Payments)
```bash
PAYSTACK_SECRET_KEY="sk_test_xxxx"
PAYSTACK_PUBLIC_KEY="pk_test_xxxx"
```
- **Description**: Paystack API keys for payment processing
- **Required for**: Payment initialization, verification, webhooks
- **Get from**: https://dashboard.paystack.com/#/settings/developer

---

### 🟡 Optional (Recommended for Production)

#### Application Settings
```bash
NODE_ENV="development"                    # development | production
PORT=3000                                 # API server port
HOST="0.0.0.0"                           # Server host
LOG_LEVEL="info"                         # Logging level: error | warn | info | debug
FRONTEND_URL="http://localhost:3001"    # Frontend URL for CORS and callbacks
```

#### Email Service (Brevo/Sendinblue)
```bash
BREVO_API_KEY="xkeysib-xxxx"
BREVO_SENDER_EMAIL="noreply@getiickets.com"
BREVO_SENDER_NAME="getiickets"
```
- **Description**: Brevo API credentials for sending transactional emails
- **Required for**: Registration verification emails, ticket confirmation emails
- **Get from**: https://app.brevo.com/settings/keys/api
- **Note**: Without this, verification and ticket emails won't be sent. In development, if verification email fails, the 6‑digit code is logged to the API console — use "Resend code" on the verify page and check the API terminal.

#### SMS Service (Twilio)
```bash
TWILIO_ACCOUNT_SID="ACxxxx"
TWILIO_AUTH_TOKEN="xxxx"
TWILIO_PHONE_NUMBER="+234xxx"
```
- **Description**: Twilio credentials for sending SMS notifications
- **Required for**: SMS ticket confirmations
- **Get from**: https://console.twilio.com/
- **Note**: Without this, SMS notifications won't be sent

#### AWS S3 (File Storage)
```bash
AWS_REGION="us-east-2"                   # US East (Ohio)
AWS_ACCESS_KEY_ID="AKIAVXPK52DNAX2YKANC"
AWS_SECRET_ACCESS_KEY="your-secret-key"   # Set in .env file, never commit
AWS_S3_BUCKET="getiickets-s3-michael-asere"
AWS_CLOUDFRONT_URL=""                    # Optional: CloudFront CDN URL
```
- **Description**: AWS credentials for storing ticket PDFs and QR codes
- **Required for**: Ticket PDF generation and storage
- **Get from**: AWS IAM Console
- **Note**: Without this, ticket PDFs won't be uploaded to S3
- **⚠️ Security**: Never commit AWS credentials to git. Store in `.env` file only.

---

## Frontend (`apps/web/.env.local`)

### 🔴 Required

```bash
NEXT_PUBLIC_API_URL="http://localhost:3000"
```
- **Description**: Backend API base URL
- **Format**: Full URL without trailing slash
- **Local Dev**: `http://localhost:3000`
- **Production**: `https://api.getiickets.com`

```bash
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY="pk_test_xxxx"
```
- **Description**: Paystack public key for payment widget
- **Get from**: https://dashboard.paystack.com/#/settings/developer
- **Note**: Use test keys for development, live keys for production

---

### 🟡 Optional

```bash
NEXT_PUBLIC_APP_ENV="development"        # development | production
```

---

## Environment Variables Summary

### Minimum Required for Local Development

**Backend (`apps/api/.env`):**
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/ticketing"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="dev-secret-key-change-in-production"
PAYSTACK_SECRET_KEY="sk_test_xxxx"
PAYSTACK_PUBLIC_KEY="pk_test_xxxx"
FRONTEND_URL="http://localhost:3001"
```

**Frontend (`apps/web/.env.local`):**
```bash
NEXT_PUBLIC_API_URL="http://localhost:3000"
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY="pk_test_xxxx"
```

### Production Requirements

All variables listed above are required for production, plus:

- **Email Service** (Brevo) - For ticket delivery
- **SMS Service** (Twilio) - For SMS notifications  
- **AWS S3** - For ticket PDF storage
- **Strong JWT_SECRET** - Use a secure random string
- **Production Paystack Keys** - Switch from test to live keys

---

## Quick Setup Commands

### 1. Create Backend .env file
```bash
cd apps/api
cp .env.example .env
# Edit .env with your values
```

### 2. Create Frontend .env.local file
```bash
cd apps/web
cp .env.example .env.local
# Edit .env.local with your values
```

### 3. Verify Environment Variables
```bash
# Check backend
cd apps/api && node -e "require('dotenv').config(); console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✓ Set' : '✗ Missing')"

# Check frontend
cd apps/web && node -e "console.log('API_URL:', process.env.NEXT_PUBLIC_API_URL || '✗ Missing')"
```

---

## Notes

- **Never commit `.env` files** to version control (already in `.gitignore`)
- **Use different keys** for development and production
- **Rotate secrets regularly** in production
- **Test all integrations** before deploying to production
- **Backend services** (Brevo, Twilio, AWS) can be added incrementally - the app will work without them but those features won't function

---

## Service Status Indicators

The application will work with minimal setup, but features will be limited:

| Service | Status Without Config | Impact |
|---------|---------------------|--------|
| Database | ❌ App won't start | Critical |
| Redis | ⚠️ Limited functionality | High - No caching, no atomic reservations |
| Paystack | ❌ Payments won't work | Critical |
| JWT Secret | ⚠️ Uses default (insecure) | High - Security risk |
| Brevo | ✅ App works | Low - No email notifications |
| Twilio | ✅ App works | Low - No SMS notifications |
| AWS S3 | ⚠️ PDFs won't upload | Medium - Tickets generated but not stored |
