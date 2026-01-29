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

export class SessionService {
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
    await redis.setex(`sess:${sessionId}`, ttl, JSON.stringify(sessionData));

    return sessionId;
  }

  // Get session data
  async getSession(sessionId: string): Promise<SessionData | null> {
    const data = await redis.get(`sess:${sessionId}`);
    if (!data) return null;
    return JSON.parse(data) as SessionData;
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
    await redis.setex(`sess:${sessionId}`, ttl, JSON.stringify(session));
  }

  // Update active role context
  async updateActiveRole(sessionId: string, role: 'buyer' | 'organizer'): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    session.activeRole = role;
    const ttl = session.roles.includes('ORGANIZER') ? 7200 : 28800;
    await redis.setex(`sess:${sessionId}`, ttl, JSON.stringify(session));
  }

  // Delete session (logout)
  async deleteSession(sessionId: string): Promise<void> {
    await redis.del(`sess:${sessionId}`);
  }
}
