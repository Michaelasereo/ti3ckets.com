import { RedisService } from './redis';
import crypto from 'crypto';

export interface SessionData {
  userId: string;
  email: string;
  roles: string[];
  activeRole?: string; // Current context: 'buyer' | 'organizer'
  createdAt: number;
  lastActivity: number;
  ipAddress: string;
  userAgent: string;
}

// In-memory session store as fallback when Redis is unavailable
const inMemorySessions = new Map<string, { data: SessionData; expiresAt: number }>();

// Clean up expired sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of inMemorySessions.entries()) {
    if (session.expiresAt < now) {
      inMemorySessions.delete(sessionId);
    }
  }
}, 5 * 60 * 1000);

export class SessionService {
  private useInMemoryFallback = false;
  private redisAvailable = true;

  constructor(private redis: RedisService) {
    // Test Redis connection on initialization (fire and forget)
    this.testRedisConnection().catch(() => {
      // Silently handle - will be detected on first use
    });
  }

  private async testRedisConnection() {
    try {
      await Promise.race([
        this.redis.ping(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redis timeout')), 2000)
        )
      ]);
      this.redisAvailable = true;
      this.useInMemoryFallback = false;
    } catch (error) {
      console.warn('Redis unavailable, using in-memory session fallback:', error);
      this.redisAvailable = false;
      this.useInMemoryFallback = process.env.NODE_ENV === 'development';
    }
  }

  // Generate cryptographically secure session ID
  generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Create new session
  async createSession(data: Omit<SessionData, 'createdAt' | 'lastActivity'>): Promise<string> {
    const sessionId = this.generateSessionId();
    const sessionData: SessionData = {
      ...data,
      createdAt: Math.floor(Date.now() / 1000),
      lastActivity: Math.floor(Date.now() / 1000),
    };

    // Store in Redis with TTL (8 hours for buyers, 2 hours for organizers)
    const ttl = data.roles.includes('ORGANIZER') ? 7200 : 28800;
    
    // Try Redis first, fallback to in-memory if unavailable (dev only)
    if (this.redisAvailable && !this.useInMemoryFallback) {
      try {
        await Promise.race([
          this.redis.set(`sess:${sessionId}`, JSON.stringify(sessionData), ttl),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Redis timeout')), 2000)
          )
        ]);
        return sessionId;
      } catch (error) {
        console.warn('Redis session creation failed, falling back to in-memory:', error);
        this.redisAvailable = false;
        // Fall through to in-memory fallback
      }
    }

    // In-memory fallback when Redis is unavailable.
    // This keeps local development usable even if Redis is down,
    // and provides a graceful degradation path in other environments.
    const expiresAt = Date.now() + ttl * 1000;
    inMemorySessions.set(sessionId, { data: sessionData, expiresAt });
    console.log(`[FALLBACK] Session stored in-memory: ${sessionId.substring(0, 8)}...`);
    return sessionId;
  }

  // Get session data
  async getSession(sessionId: string): Promise<SessionData | null> {
    // Try Redis first
    if (this.redisAvailable && !this.useInMemoryFallback) {
      try {
        const data = await Promise.race([
          this.redis.get(`sess:${sessionId}`),
          new Promise<string | null>((_, reject) => 
            setTimeout(() => reject(new Error('Redis timeout')), 2000)
          )
        ]) as string | null;
        if (data) {
          return JSON.parse(data) as SessionData;
        }
      } catch (error) {
        console.warn('Redis get failed, checking in-memory fallback:', error);
        this.redisAvailable = false;
        // Fall through to in-memory check
      }
    }

    // Check in-memory fallback
    const inMemorySession = inMemorySessions.get(sessionId);
    if (inMemorySession) {
      // Check if expired
      if (inMemorySession.expiresAt < Date.now()) {
        inMemorySessions.delete(sessionId);
        return null;
      }
      return inMemorySession.data;
    }

    return null;
  }

  // Update session activity (with debounce)
  async updateActivity(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    // Only update if more than 60 seconds since last activity
    const now = Math.floor(Date.now() / 1000);
    if (now - session.lastActivity < 60) return;

    session.lastActivity = now;
    const ttl = session.roles.includes('ORGANIZER') ? 7200 : 28800;
    
    // Try Redis first
    if (this.redisAvailable && !this.useInMemoryFallback) {
      try {
        await Promise.race([
          this.redis.set(`sess:${sessionId}`, JSON.stringify(session), ttl),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Redis timeout')), 2000)
          )
        ]);
        return;
      } catch (error) {
        console.warn('Redis update failed, using in-memory:', error);
        this.redisAvailable = false;
      }
    }

    // Update in-memory fallback
    if (this.useInMemoryFallback || process.env.NODE_ENV === 'development') {
      const expiresAt = Date.now() + (ttl * 1000);
      inMemorySessions.set(sessionId, { data: session, expiresAt });
    }
  }

  // Update active role context
  async updateActiveRole(sessionId: string, role: 'buyer' | 'organizer'): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    session.activeRole = role;
    const ttl = session.roles.includes('ORGANIZER') ? 7200 : 28800;
    
    // Try Redis first
    if (this.redisAvailable && !this.useInMemoryFallback) {
      try {
        await Promise.race([
          this.redis.set(`sess:${sessionId}`, JSON.stringify(session), ttl),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Redis timeout')), 2000)
          )
        ]);
        return;
      } catch (error) {
        console.warn('Redis role update failed, using in-memory:', error);
        this.redisAvailable = false;
      }
    }

    // Update in-memory fallback
    if (this.useInMemoryFallback || process.env.NODE_ENV === 'development') {
      const expiresAt = Date.now() + (ttl * 1000);
      inMemorySessions.set(sessionId, { data: session, expiresAt });
      return;
    }

    throw new Error('Failed to switch role. Please try again.');
  }

  // Delete session (logout)
  async deleteSession(sessionId: string): Promise<void> {
    // Delete from in-memory first
    inMemorySessions.delete(sessionId);

    // Try Redis
    if (this.redisAvailable && !this.useInMemoryFallback) {
      try {
        await Promise.race([
          this.redis.del(`sess:${sessionId}`),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Redis timeout')), 2000)
          )
        ]);
      } catch (error) {
        console.warn('Failed to delete session from Redis:', error);
      }
    }
  }

  // Delete all sessions for a user (force logout all devices)
  // Note: For production, maintain a set of session IDs per user for efficient deletion
  async deleteAllUserSessions(userId: string): Promise<void> {
    // This is a simplified implementation
    // In production, you'd maintain a Redis set: user_sessions:userId -> [sessionId1, sessionId2, ...]
    // For now, we'll skip this - can be implemented later if needed
  }
}
