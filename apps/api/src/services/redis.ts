import Redis from 'ioredis';

export class RedisService {
  public client: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    // Detect if URL uses TLS (rediss://)
    const useTLS = redisUrl.startsWith('rediss://');
    
    this.client = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: true, // Allow queueing - will reconnect automatically
      lazyConnect: true,
      connectTimeout: 10000, // 10 second connection timeout (increased for TLS)
      commandTimeout: 5000, // 5 second command timeout (increased)
      ...(useTLS && {
        tls: {
          rejectUnauthorized: false, // Upstash uses self-signed certificates
        },
      }),
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true; // Reconnect on READONLY error
        }
        // Also reconnect on connection errors
        if (err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND')) {
          return true;
        }
        return false;
      },
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      console.error('Error details:', {
        message: err.message,
        code: (err as any).code,
        errno: (err as any).errno,
        syscall: (err as any).syscall,
        address: (err as any).address,
        port: (err as any).port,
      });
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
    });

    this.client.on('ready', () => {
      console.log('Redis Client Ready');
    });

    this.client.on('close', () => {
      console.log('Redis Client Closed');
    });

    this.client.on('reconnecting', (delay) => {
      console.log(`Redis Client Reconnecting in ${delay}ms`);
    });
  }

  async ping(): Promise<string> {
    try {
      await this.ensureConnection();
      return await this.client.ping();
    } catch (error) {
      console.error('Redis ping error:', error);
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      await this.ensureConnection();
      return await this.client.get(key);
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      await this.ensureConnection();
      if (ttl) {
        await this.client.setex(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      console.error('Redis set error:', error);
      // Don't throw - allow app to continue without cache
    }
  }

  async del(key: string): Promise<number> {
    try {
      await this.ensureConnection();
      return await this.client.del(key);
    } catch (error) {
      console.error('Redis del error:', error);
      return 0;
    }
  }

  /**
   * Invalidate all events list cache entries (keys matching events:*).
   * Call when an event is published or listing-affecting data changes.
   */
  async invalidateEventsListCache(): Promise<void> {
    try {
      await this.ensureConnection();
      const keys = await this.client.keys('events:*');
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      console.warn('Redis invalidateEventsListCache error:', error);
    }
  }

  /**
   * Invalidate cache for a single event (list and detail by id/slug).
   * Call when an event is updated or published.
   */
  async invalidateEventDetailCache(id: string, slug: string): Promise<void> {
    try {
      await this.ensureConnection();
      await this.client.del(`event:${id}`, `event:slug:${slug}`);
    } catch (error) {
      console.warn('Redis invalidateEventDetailCache error:', error);
    }
  }

  /**
   * Invalidate cache for all events of an organizer (e.g. when organizer profile/avatar changes).
   * Call with the list of events from event.findMany({ where: { organizerId } }).
   */
  async invalidateEventCachesForOrganizer(events: { id: string; slug: string }[]): Promise<void> {
    try {
      await this.ensureConnection();
      for (const event of events) {
        await this.client.del(`event:${event.id}`, `event:slug:${event.slug}`);
      }
    } catch (error) {
      console.warn('Redis invalidateEventCachesForOrganizer error:', error);
    }
  }

  async exists(key: string): Promise<number> {
    return this.client.exists(key);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async decr(key: string): Promise<number> {
    return this.client.decr(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }

  // Ensure Redis connection is ready
  private async ensureConnection(): Promise<void> {
    let status = this.client.status;
    
    // If disconnected or closed, try to connect
    if (status === 'end' || status === 'close') {
      try {
        await this.client.connect();
        status = this.client.status;
      } catch (error) {
        console.error('Failed to connect to Redis:', error);
        throw error;
      }
    }
    
    // If status is 'wait', it means lazyConnect is true and connection hasn't started
    // Force connection by calling connect()
    if (status === 'wait') {
      try {
        await this.client.connect();
        status = this.client.status;
      } catch (error) {
        console.error('Failed to initiate Redis connection:', error);
        throw error;
      }
    }
    
    // Wait for connection to be ready (if connecting)
    if (status === 'connecting') {
      // Wait up to 10 seconds for connection (increased for TLS)
      const maxWait = 10000;
      const startTime = Date.now();
      
      while (this.client.status !== 'ready' && Date.now() - startTime < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
        // Check if connection failed
        if (this.client.status === 'end' || this.client.status === 'close') {
          throw new Error('Redis connection failed during connection attempt');
        }
      }
      
      status = this.client.status;
      if (status !== 'ready') {
        throw new Error(`Redis connection timeout. Final status: ${status}`);
      }
    }
    
    // If still not ready, throw error
    if (this.client.status !== 'ready') {
      throw new Error(`Redis connection not ready. Status: ${this.client.status}`);
    }
  }

  // Atomic ticket reservation using Lua script
  async reserveTickets(
    ticketTypeKey: string,
    reservationKey: string,
    quantity: number,
    expirySeconds: number = 600
  ): Promise<boolean> {
    try {
      // Ensure connection is ready before query
      await this.ensureConnection();

      const luaScript = `
      local current = redis.call('GET', KEYS[1])
      if current and tonumber(current) >= tonumber(ARGV[1]) then
        redis.call('DECRBY', KEYS[1], ARGV[1])
        redis.call('SETEX', KEYS[2], ARGV[2], ARGV[1])
        return 1
      else
        return 0
      end
    `;

      const result = await this.client.eval(
        luaScript,
        2,
        ticketTypeKey,
        reservationKey,
        quantity.toString(),
        expirySeconds.toString()
      );

      return result === 1;
    } catch (error) {
      console.error('Redis reserveTickets error:', error);
      // Log more details about the error
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          redisStatus: this.client.status,
        });
      }
      throw error; // Re-throw to allow caller to handle appropriately
    }
  }

  // Release reserved tickets
  async releaseReservation(
    ticketTypeKey: string,
    reservationKey: string,
    quantity: number
  ): Promise<void> {
    try {
      await this.ensureConnection();

      const luaScript = `
      local reserved = redis.call('GET', KEYS[2])
      if reserved and tonumber(reserved) > 0 then
        redis.call('INCRBY', KEYS[1], ARGV[1])
        redis.call('DEL', KEYS[2])
      end
    `;

      await this.client.eval(luaScript, 2, ticketTypeKey, reservationKey, quantity.toString());
    } catch (error) {
      console.error('Redis releaseReservation error:', error);
      // Don't throw - allow cleanup to continue even if Redis fails
    }
  }

  async initializeTicketAvailability(ticketTypeId: string, available: number): Promise<void> {
    try {
      await this.ensureConnection();
      const key = `ticket:${ticketTypeId}:available`;
      // Only set if key doesn't exist (NX flag) with 1 hour expiry
      await this.client.set(key, available.toString(), 'EX', 3600, 'NX');
    } catch (error) {
      console.error('Redis initializeTicketAvailability error:', error);
      // Log more details
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          redisStatus: this.client.status,
        });
      }
      throw error; // Re-throw to allow caller to handle appropriately
    }
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }

  // Get connection status for diagnostics
  getConnectionStatus(): string {
    return this.client.status;
  }

  // Check if Redis is available
  async isAvailable(): Promise<boolean> {
    try {
      await this.ping();
      return true;
    } catch {
      return false;
    }
  }
}
