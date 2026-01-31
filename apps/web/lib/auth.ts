import jwt from 'jsonwebtoken';
import { SessionService } from './session';

export interface AuthUser {
  userId: string;
  email: string;
  roles?: string[];
  activeRole?: string;
}

// Get auth from request - supports both cookies (sessions) and JWT (backward compatibility)
export async function getAuthFromRequest(request: Request): Promise<AuthUser | null> {
  // Try session cookie first
  const cookies = request.headers.get('cookie');
  if (cookies) {
    const sessionMatch = cookies.match(/session=([^;]+)/);
    if (sessionMatch) {
      const sessionId = sessionMatch[1];
      
      // Validate session via Redis
      try {
        const { SessionService } = await import('./session');
        const sessionService = new SessionService();
        const session = await sessionService.getSession(sessionId);
        
        if (session) {
          // Check if session is still valid
          const now = Math.floor(Date.now() / 1000);
          const maxAge = session.roles.includes('ORGANIZER') ? 7200 : 28800;
          if (now - session.lastActivity <= maxAge) {
            return {
              userId: session.userId,
              email: session.email,
              roles: session.roles,
              activeRole: session.activeRole,
            };
          }
        }
      } catch (error) {
        console.error('Error validating session:', error);
      }
    }
  }

  // Fallback to JWT for backward compatibility
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    
    // Handle mock tokens (for demo/development)
    if (token.startsWith('mock.')) {
      try {
        const payload = JSON.parse(atob(token.slice(5)));
        return { userId: payload.userId, email: payload.email, roles: ['BUYER'] };
      } catch {
        return null;
      }
    }

    const secret = process.env.JWT_SECRET || 'your-secret-key';

    try {
      const decoded = jwt.verify(token, secret) as { userId: string; email: string };
      return {
        userId: decoded.userId,
        email: decoded.email,
        roles: ['BUYER'], // Default for JWT
      };
    } catch {
      return null;
    }
  }

  return null;
}

export async function requireAuth(request: Request): Promise<AuthUser> {
  const user = await getAuthFromRequest(request);
  if (!user) throw new ApiError(401, 'Missing or invalid authorization');
  return user;
}

export async function requireRole(request: Request, role: string): Promise<AuthUser> {
  const user = await requireAuth(request);
  if (!user.roles?.includes(role)) {
    throw new ApiError(403, `Forbidden: requires ${role} role`);
  }
  return user;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}
