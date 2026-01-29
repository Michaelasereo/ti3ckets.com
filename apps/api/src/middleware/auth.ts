import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../services/session';
import { Role } from '@prisma/client';

export interface AuthUser {
  userId: string;
  email: string;
  roles: string[];
  activeRole?: string;
}

function runValidateSession(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    validateSession(req, res, (err?: any) => {
      if (err) return reject(err);
      resolve();
    }).catch(reject);
  });
}

// Session-based authentication (primary method)
export async function validateSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const sessionId = req.cookies.session;
  
  if (!sessionId) {
    const error: any = new Error('No session found');
    error.statusCode = 401;
    res.clearCookie('session');
    return next(error);
  }

  const sessionService = new SessionService(req.redis);
  const session = await sessionService.getSession(sessionId);

  if (!session) {
    const error: any = new Error('Session expired or invalid');
    error.statusCode = 401;
    res.clearCookie('session');
    return next(error);
  }

  // Check inactivity timeout
  const now = Math.floor(Date.now() / 1000);
  const maxAge = session.roles.includes('ORGANIZER') ? 7200 : 28800;
  if (now - session.lastActivity > maxAge) {
    await sessionService.deleteSession(sessionId);
    const error: any = new Error('Session expired');
    error.statusCode = 401;
    res.clearCookie('session');
    return next(error);
  }

  // Update activity (debounced)
  await sessionService.updateActivity(sessionId);

  // Attach to request
  req.session = session;
  req.user = {
    userId: session.userId,
    email: session.email,
    roles: session.roles,
    activeRole: session.activeRole,
  };

  next();
}

// Role-based authorization
export async function requireRole(
  req: Request,
  res: Response,
  next: NextFunction,
  role: Role
): Promise<void> {
  try {
    await runValidateSession(req, res);
    
    if (!req.user?.roles.includes(role)) {
      const error: any = new Error(`Forbidden: User does not have ${role} role`);
      error.statusCode = 403;
      return next(error);
    }
    
    next();
  } catch (error) {
    next(error);
  }
}

// Helper to create role-based middleware
export const requireRoleMiddleware = (role: Role) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await requireRole(req, res, next, role);
  };
};

// Backward compatibility: JWT authentication (for transition period)
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Try session first
  try {
    await runValidateSession(req, res);
    if (req.user) {
      return next();
    }
  } catch (sessionError) {
    // Fall back to JWT if session not found
  }

  // Fallback to JWT for backward compatibility
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error: any = new Error('Missing or invalid authorization header');
      error.statusCode = 401;
      return next(error);
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return next(new Error('JWT_SECRET not configured'));
    }

    const jwt = await import('jsonwebtoken');
    const decoded = jwt.verify(token, secret) as { userId: string; email: string };
    
    // Load roles from database for JWT users
    const userRoles = await req.prisma.userRole.findMany({
      where: { userId: decoded.userId },
      select: { role: true },
    });
    const roles = userRoles.map(ur => ur.role);

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      roles: roles.length > 0 ? roles : ['BUYER'],
    };

    next();
  } catch (error) {
    const err: any = new Error('Invalid or expired token');
    err.statusCode = 401;
    return next(err);
  }
}

export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  (async () => {
    try {
      await runValidateSession(req, res);
      if (req.user) return next();
    } catch {
      // Ignore and try JWT below
    }

    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

      const token = authHeader.substring(7);
      const secret = process.env.JWT_SECRET;
      if (!secret) return next();

      const jwt = await import('jsonwebtoken');
      const decoded = jwt.verify(token, secret) as { userId: string; email: string };
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        roles: ['BUYER'], // Default for optional auth
      };
      return next();
    } catch {
      return next();
    }
  })();
}
