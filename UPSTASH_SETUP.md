# Upstash Redis Setup Guide

This guide will help you set up Upstash Redis for the getiickets platform.

## What is Upstash?

Upstash is a serverless Redis service that provides:
- **Serverless Redis** (pay-per-request, no idle costs)
- **Global replication** (low latency worldwide)
- **Automatic scaling** (handles traffic spikes)
- **Free Tier**: 10,000 commands/day, 256MB storage

## Step 1: Create Upstash Account

1. Go to [upstash.com](https://upstash.com)
2. Click **"Sign Up"**
3. Sign up with GitHub, Google, or email
4. Verify your email if required

## Step 2: Create a Redis Database

1. In your Upstash dashboard, click **"Create Database"**
2. Fill in database details:
   - **Name**: `getiickets-redis` (or your preferred name)
   - **Type**: **Regional** (recommended for most use cases)
     - **Global** (for multi-region, higher cost)
   - **Region**: Choose closest to your users:
     - **Africa**: `eu-west-1` (Ireland) or `ap-southeast-1` (Singapore)
     - **US**: `us-east-1` (N. Virginia)
     - **Europe**: `eu-west-1` (Ireland)
   - **Primary Region**: Select your primary region
3. Click **"Create"**

## Step 3: Get Connection URL

1. Click on your newly created database
2. Go to **Details** tab
3. You'll see connection information:

### REST API (Optional)
- **UPSTASH_REDIS_REST_URL**: For REST API access
- **UPSTASH_REDIS_REST_TOKEN**: Authentication token

### Redis URL (What we need)
- **Endpoint**: `[your-db].upstash.io`
- **Port**: `6379` (or `6380` for TLS)
- **Password**: Auto-generated (copy this!)

### Connection String Format

**Without TLS:**
```
redis://default:[PASSWORD]@[ENDPOINT].upstash.io:6379
```

**With TLS (Recommended for production):**
```
rediss://default:[PASSWORD]@[ENDPOINT].upstash.io:6380
```

## Step 4: Update Environment Variables

Edit `apps/api/.env`:

```bash
# Replace [PASSWORD] with your database password
# Replace [ENDPOINT] with your endpoint
REDIS_URL="rediss://default:[PASSWORD]@[ENDPOINT].upstash.io:6380"
```

### Example:
```bash
REDIS_URL="rediss://default:AXrQACQgYjY5NzE2YjE0YjU0YjU0YjU0YjU0YjU0YjU0YjU0YjU0YjU0@getiickets-12345.upstash.io:6380"
```

## Step 5: Test Connection

```bash
# Test from command line (if redis-cli installed)
redis-cli -u "rediss://default:[PASSWORD]@[ENDPOINT].upstash.io:6380" ping
# Should return: PONG
```

Or test from your Node.js app:

```typescript
import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL
});

await redis.connect();
await redis.ping(); // Should return "PONG"
```

## Step 6: Verify in Your Application

The Redis service in `apps/api/src/services/redis.ts` should automatically work with Upstash URLs. No code changes needed!

## Free Tier Limits

- **Commands**: 10,000/day
- **Storage**: 256MB
- **Bandwidth**: 1GB/day
- **Databases**: 1 database
- **Regions**: 1 region

**Note**: Free tier resets daily. Perfect for development and small production apps.

## Production Considerations

### When to Upgrade

Upgrade to paid tier when you need:
- More than 10K commands/day
- More than 256MB storage
- Global replication
- Higher bandwidth

### Pricing

- **Pay-as-you-go**: $0.20 per 100K commands
- **Fixed Plans**: Starting at $10/month
  - 100K commands/day
  - 1GB storage
  - 10GB bandwidth

### TLS/SSL

Upstash supports TLS connections. Use `rediss://` (with double 's') for secure connections:
- Port `6380` for TLS
- Port `6379` for non-TLS (not recommended for production)

### Connection Pooling

Upstash handles connection pooling automatically. Your Redis client will manage connections efficiently.

## Use Cases in getiickets

### 1. Ticket Reservation (Atomic Operations)

```typescript
// Reserve tickets atomically
const reserved = await redis.eval(
  reserveTicketsScript,
  {
    keys: [`event:${eventId}:tickets`],
    arguments: [ticketTypeId, quantity.toString()]
  }
);
```

### 2. Rate Limiting

```typescript
// Limit API requests per user
const key = `rate_limit:${userId}`;
const requests = await redis.incr(key);
if (requests === 1) {
  await redis.expire(key, 60); // 1 minute window
}
if (requests > 100) {
  throw new Error('Rate limit exceeded');
}
```

### 3. Caching

```typescript
// Cache event data
const cacheKey = `event:${eventId}`;
const cached = await redis.get(cacheKey);
if (cached) {
  return JSON.parse(cached);
}

// Fetch from database
const event = await prisma.event.findUnique({ where: { id: eventId } });

// Cache for 5 minutes
await redis.setEx(cacheKey, 300, JSON.stringify(event));
```

### 4. Session Storage

```typescript
// Store user sessions
await redis.setEx(`session:${sessionId}`, 3600, JSON.stringify(userData));
```

## Monitoring

1. Go to your database dashboard
2. View **Metrics** tab to see:
   - Commands per day
   - Storage usage
   - Bandwidth usage
   - Latency

## Troubleshooting

### Connection Errors

**Error**: `ECONNREFUSED` or `Connection timeout`

**Solutions**:
1. Check your `REDIS_URL` format
2. Ensure password is correct
3. Check if using correct port (6380 for TLS)
4. Verify database is active in Upstash dashboard

### TLS/SSL Errors

**Error**: `SSL connection error`

**Solutions**:
1. Use `rediss://` (double 's') for TLS
2. Use port `6380` for TLS connections
3. Ensure your Redis client supports TLS

### Command Limit Exceeded

**Error**: `Command limit exceeded`

**Solutions**:
1. Check your daily command usage in dashboard
2. Implement caching to reduce commands
3. Upgrade to paid tier if needed
4. Optimize Redis operations (batch commands)

### Memory Limit

**Error**: `OOM command not allowed`

**Solutions**:
1. Check storage usage in dashboard
2. Set TTL on keys to auto-expire
3. Use Redis eviction policies
4. Upgrade storage if needed

## Best Practices

### 1. Set TTL on Keys

Always set expiration on cached data:

```typescript
await redis.setEx(key, ttl, value); // Auto-expires
```

### 2. Use Pipelines for Batch Operations

```typescript
const pipeline = redis.pipeline();
pipeline.set('key1', 'value1');
pipeline.set('key2', 'value2');
pipeline.set('key3', 'value3');
await pipeline.exec(); // Single network round-trip
```

### 3. Monitor Command Usage

Check your dashboard regularly to avoid hitting limits.

### 4. Use Appropriate Data Structures

- **Strings**: Simple key-value
- **Hashes**: Object storage
- **Lists**: Queues
- **Sets**: Unique collections
- **Sorted Sets**: Ranked lists

## Migration from Local Redis

If you were using local Redis:

1. Export data (if needed):
```bash
redis-cli --rdb dump.rdb
```

2. Update `REDIS_URL` in `.env`
3. Restart your application
4. Data will be fresh (Upstash starts empty)

**Note**: Upstash is serverless, so you typically don't need to migrate data. Just update the connection URL.

## Next Steps

1. ✅ Set up Upstash account
2. ✅ Create Redis database
3. ✅ Update environment variables
4. ✅ Test connection
5. ⬜ Monitor usage in dashboard
6. ⬜ Optimize Redis operations

## Resources

- [Upstash Documentation](https://docs.upstash.com/redis)
- [Redis Commands Reference](https://redis.io/commands)
- [Upstash Pricing](https://upstash.com/pricing)
- [Upstash Discord](https://discord.gg/upstash)
