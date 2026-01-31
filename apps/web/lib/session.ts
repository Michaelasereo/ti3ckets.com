import crypto from 'crypto';
import { redis } from './redis';

export interface SessionData {
  userId: string;
  email: string;
  roles: string[];
  activeRole?: string;
  createdAt: number;
  lastActivity: number;
  ipAddress: string;
  userAgent: string;
}

// In-memory session store when Redis is unavailable (dev only)
const inMemorySessions = new Map<string, { data: SessionData; expiresAt: number }>();

function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [sessionId, session] of inMemorySessions.entries()) {
    if (session.expiresAt < now) {
      inMemorySessions.delete(sessionId);
    }
  }
}

// Clean up expired sessions every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredSessions, 5 * 60 * 1000);
}

let useInMemoryFallback = false;
let redisAvailable = true;

async function redisSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (useInMemoryFallback) return;
  try {
    await Promise.race([
      redis.setex(key, ttlSeconds, value),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Redis timeout')), 2000)
      ),
    ]);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Redis set failed, using in-memory fallback:', error);
      redisAvailable = false;
      useInMemoryFallback = true;
    } else {
      throw error;
    }
  }
}

async function redisGet(key: string): Promise<string | null> {
  if (useInMemoryFallback) return null;
  try {
    return await Promise.race([
      redis.get(key),
      new Promise<string | null>((_, reject) =>
        setTimeout(() => reject(new Error('Redis timeout')), 2000)
      ),
    ]);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Redis get failed, using in-memory fallback:', error);
      redisAvailable = false;
      useInMemoryFallback = true;
    }
    return null;
  }
}

async function redisDel(key: string): Promise<void> {
  if (useInMemoryFallback) return;
  try {
    await Promise.race([
      redis.del(key),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Redis timeout')), 2000)
      ),
    ]);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      redisAvailable = false;
      useInMemoryFallback = true;
    }
  }
}

export class SessionService {
  generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async createSession(data: Omit<SessionData, 'createdAt' | 'lastActivity'>): Promise<string> {
    const sessionId = this.generateSessionId();
    const sessionData: SessionData = {
      ...data,
      createdAt: Math.floor(Date.now() / 1000),
      lastActivity: Math.floor(Date.now() / 1000),
    };

    const ttl = data.roles.includes('ORGANIZER') ? 7200 : 28800;

    if (redisAvailable && !useInMemoryFallback) {
      await redisSet(`sess:${sessionId}`, JSON.stringify(sessionData), ttl);
      if (useInMemoryFallback) {
        const expiresAt = Date.now() + ttl * 1000;
        inMemorySessions.set(sessionId, { data: sessionData, expiresAt });
        console.log(`[FALLBACK] Session stored in-memory: ${sessionId.substring(0, 8)}...`);
      }
    } else if (process.env.NODE_ENV === 'development') {
      const expiresAt = Date.now() + ttl * 1000;
      inMemorySessions.set(sessionId, { data: sessionData, expiresAt });
      console.log(`[FALLBACK] Session stored in-memory: ${sessionId.substring(0, 8)}...`);
    } else {
      throw new Error('Redis unavailable and in-memory fallback only allowed in development');
    }

    return sessionId;
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    // In-memory fallback store (dev)
    const inMem = inMemorySessions.get(sessionId);
    if (inMem) {
      if (inMem.expiresAt < Date.now()) {
        inMemorySessions.delete(sessionId);
        return null;
      }
      return inMem.data;
    }

    // Redis
    const data = await redisGet(`sess:${sessionId}`);
    if (!data) return null;
    return JSON.parse(data) as SessionData;
  }

  async updateActivity(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    const now = Math.floor(Date.now() / 1000);
    if (now - session.lastActivity < 60) return;

    session.lastActivity = now;
    const ttl = session.roles.includes('ORGANIZER') ? 7200 : 28800;

    if (useInMemoryFallback) {
      const entry = inMemorySessions.get(sessionId);
      if (entry) {
        entry.data = session;
        entry.expiresAt = Date.now() + ttl * 1000;
      }
      return;
    }
    await redisSet(`sess:${sessionId}`, JSON.stringify(session), ttl);
  }

  async updateActiveRole(sessionId: string, role: 'buyer' | 'organizer'): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    session.activeRole = role;
    const ttl = session.roles.includes('ORGANIZER') ? 7200 : 28800;

    if (useInMemoryFallback) {
      const entry = inMemorySessions.get(sessionId);
      if (entry) {
        entry.data = session;
        entry.expiresAt = Date.now() + ttl * 1000;
      }
      return;
    }
    await redisSet(`sess:${sessionId}`, JSON.stringify(session), ttl);
  }

  async deleteSession(sessionId: string): Promise<void> {
    inMemorySessions.delete(sessionId);
    await redisDel(`sess:${sessionId}`);
  }

  /** Update session roles (e.g. after granting ORGANIZER). */
  async updateSessionRoles(sessionId: string, roles: string[]): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;
    session.roles = roles;
    const ttl = session.roles.includes('ORGANIZER') ? 7200 : 28800;
    const expiresAt = Date.now() + ttl * 1000;
    if (useInMemoryFallback) {
      const entry = inMemorySessions.get(sessionId);
      if (entry) {
        entry.data = session;
        entry.expiresAt = expiresAt;
      } else {
        inMemorySessions.set(sessionId, { data: session, expiresAt });
      }
      return;
    }
    await redisSet(`sess:${sessionId}`, JSON.stringify(session), ttl);
    if (useInMemoryFallback) {
      inMemorySessions.set(sessionId, { data: session, expiresAt });
    }
  }
}
