import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { SessionService } from '../services/session';
import { BrevoService } from '../services/brevo';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

// POST /api/v1/auth/register - User registration
router.post('/register', asyncHandler(async (req, res) => {
  const body = registerSchema.parse(req.body);
  const { email, password, name, phone } = body;

  // Check if user already exists
  const existingUser = await req.prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return res.status(400).json({ success: false, error: 'User already exists' });
  }

  // Normalize phone: convert empty string to null, trim whitespace
  const normalizedPhone = phone?.trim() || null;
  
  // If phone is provided, check if it already exists
  if (normalizedPhone) {
    const existingPhoneUser = await req.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (existingPhoneUser) {
      return res.status(400).json({ success: false, error: 'Phone number already registered' });
    }
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Parse name into firstName/lastName if available
  const nameParts = name?.split(' ') || [];
  const firstName = nameParts[0] || null;
  const lastName = nameParts.slice(1).join(' ') || null;

  // Generate 6-digit verification code
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes expiry

  // Create user with BUYER role and BuyerProfile, but emailVerified=false
  const user = await req.prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      phone: normalizedPhone, // Use normalized phone (null if empty)
      emailVerified: false,
      emailVerificationCode: verificationCode,
      emailVerificationExpiresAt: expiresAt,
      lastVerificationSentAt: new Date(),
      roles: {
        create: {
          role: Role.BUYER,
        },
      },
      buyerProfile: {
        create: {
          firstName,
          lastName,
        },
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      createdAt: true,
    },
  });

  // Send verification email via Brevo
  let emailSent = false;
  try {
    const brevoService = new BrevoService();
    await brevoService.sendVerificationEmail(user.email, verificationCode, user.name || undefined);
    emailSent = true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('[dev] Verification code (email not sent):', verificationCode);
    }
  }

  // Do NOT create session yet - wait for email verification
  res.status(201).json({
    success: true,
    data: {
      message: emailSent
        ? 'Account created. Please check your email for verification code.'
        : "Account created. We couldn't send the verification email. Please use \"Resend code\" to receive it.",
      email: user.email,
      requiresVerification: true,
      emailSent,
    },
  });
}));

// POST /api/v1/auth/login - User login
router.post('/login', asyncHandler(async (req, res) => {
  const body = loginSchema.parse(req.body);
  const { email, password } = body;

  // Find user
  const user = await req.prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.passwordHash) {
    return res.status(401).json({ success: false, error: 'Invalid email or password' });
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    // Increment failed login attempts
    await req.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: {
          increment: 1,
        },
      },
    });
    return res.status(401).json({ success: false, error: 'Invalid email or password' });
  }

  // Load user roles from database
  const userRoles = await req.prisma.userRole.findMany({
    where: { userId: user.id },
    select: { role: true },
  });
  const roles = userRoles.map(ur => ur.role);

  // Create session
  const sessionService = new SessionService(req.redis);
  const sessionId = await sessionService.createSession({
    userId: user.id,
    email: user.email,
    roles: roles.length > 0 ? roles : ['BUYER'], // Default to BUYER if no roles
    ipAddress: req.ip || '',
    userAgent: req.headers['user-agent'] || '',
  });

  // Set HTTP-only cookie (8 hours so session does not expire too quickly)
  const maxAge = 28800; // 8 hours
  res.cookie('session', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: maxAge * 1000, // Convert to milliseconds
    path: '/',
  });

  // Update user last login and reset failed attempts
  await req.prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      failedLoginAttempts: 0,
    },
  });

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        roles: roles.length > 0 ? roles : ['BUYER'],
      },
    },
  });
}));

// POST /api/v1/auth/logout - Logout and delete session
router.post('/logout', asyncHandler(async (req, res) => {
  const sessionId = req.cookies.session;
  if (sessionId) {
    const sessionService = new SessionService(req.redis);
    await sessionService.deleteSession(sessionId);
  }
  res.clearCookie('session', {
    path: '/',
  });
  res.json({ success: true });
}));

// GET /api/v1/auth/session - Get current session info
router.get('/session', asyncHandler(async (req, res) => {
  const sessionId = req.cookies.session;
  if (!sessionId) {
    return res.status(401).json({ success: false, error: 'No session found' });
  }

  const sessionService = new SessionService(req.redis);
  const session = await sessionService.getSession(sessionId);

  if (!session) {
    res.clearCookie('session');
    return res.status(401).json({ success: false, error: 'Session expired or invalid' });
  }

  res.json({
    success: true,
    data: {
      userId: session.userId,
      email: session.email,
      roles: session.roles,
      activeRole: session.activeRole,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
    },
  });
}));

// POST /api/v1/auth/switch-role - Switch active role context
router.post('/switch-role', asyncHandler(async (req, res) => {
  const body = z.object({
    role: z.enum(['buyer', 'organizer']),
  }).parse(req.body);

  const sessionId = req.cookies.session;
  if (!sessionId) {
    return res.status(401).json({ success: false, error: 'No session found' });
  }

  const sessionService = new SessionService(req.redis);
  const session = await sessionService.getSession(sessionId);

  if (!session) {
    return res.status(401).json({ success: false, error: 'Session expired or invalid' });
  }

  // Validate role switch
  if (body.role === 'organizer' && !session.roles.includes('ORGANIZER')) {
    return res.status(403).json({ success: false, error: 'User does not have ORGANIZER role' });
  }

  await sessionService.updateActiveRole(sessionId, body.role);

  res.json({
    success: true,
    data: { message: 'Role switched successfully' },
  });
}));

// POST /api/v1/auth/request-organizer - Request ORGANIZER role
router.post('/request-organizer', asyncHandler(async (req, res) => {
  const sessionId = req.cookies.session;
  if (!sessionId) {
    return res.status(401).json({ success: false, error: 'No session found' });
  }

  const sessionService = new SessionService(req.redis);
  const session = await sessionService.getSession(sessionId);

  if (!session) {
    return res.status(401).json({ success: false, error: 'Session expired or invalid' });
  }

  const userId = session.userId;

  // Check if user already has ORGANIZER role
  const existingRole = await req.prisma.userRole.findUnique({
    where: {
      userId_role: {
        userId,
        role: Role.ORGANIZER,
      },
    },
  });

  if (existingRole) {
    return res.json({
      success: true,
      data: { message: 'User already has ORGANIZER role' },
    });
  }

  // Grant ORGANIZER role
  await req.prisma.userRole.create({
    data: {
      userId,
      role: Role.ORGANIZER,
    },
  });

  // Create or update OrganizerProfile
  const user = await req.prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  await req.prisma.organizerProfile.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      businessName: user?.name || 'My Business',
      verificationStatus: 'VERIFIED',
      onboardingCompleted: false,
    },
  });

  // Update session to include ORGANIZER role
  const updatedRoles = [...session.roles, 'ORGANIZER'];
  session.roles = updatedRoles;
  const ttl = 28800; // 8 hours
  await req.redis.client.set(`sess:${sessionId}`, JSON.stringify(session), 'EX', ttl);

  res.json({
    success: true,
    data: {
      message: 'ORGANIZER role granted successfully',
      roles: updatedRoles,
    },
  });
}));

// POST /api/v1/auth/verify-email - Verify email with code
const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

router.post('/verify-email', asyncHandler(async (req, res) => {
  const body = verifyEmailSchema.parse(req.body);
  const { email, code } = body;

  // Find user by email
  const user = await req.prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  // Check if already verified
  if (user.emailVerified) {
    return res.status(400).json({ success: false, error: 'Email already verified' });
  }

  // Check if verification code exists and is not expired
  if (!user.emailVerificationCode || !user.emailVerificationExpiresAt) {
    return res.status(400).json({ success: false, error: 'No verification code found. Please request a new one.' });
  }

  if (new Date() > user.emailVerificationExpiresAt) {
    return res.status(400).json({ success: false, error: 'Verification code has expired. Please request a new one.' });
  }

  // Check attempts (max 5 attempts)
  if (user.emailVerificationAttempts >= 5) {
    return res.status(429).json({ success: false, error: 'Too many verification attempts. Please request a new code.' });
  }

  // Compare codes (stored as plain text for simplicity)
  if (user.emailVerificationCode !== code) {
    // Increment attempts
    await req.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationAttempts: {
          increment: 1,
        },
      },
    });

    const remainingAttempts = 5 - (user.emailVerificationAttempts + 1);
    return res.status(400).json({
      success: false,
      error: `Invalid verification code. ${remainingAttempts > 0 ? `${remainingAttempts} attempts remaining.` : 'Please request a new code.'}`,
    });
  }

  // Code is valid - verify email and create session
  await req.prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerifiedAt: new Date(),
      emailVerificationCode: null,
      emailVerificationExpiresAt: null,
      emailVerificationAttempts: 0,
    },
  });

  // Load user roles
  const userRoles = await req.prisma.userRole.findMany({
    where: { userId: user.id },
    select: { role: true },
  });
  const roles = userRoles.map(ur => ur.role);

  // Create session now that email is verified
  const sessionService = new SessionService(req.redis);
  const sessionId = await sessionService.createSession({
    userId: user.id,
    email: user.email,
    roles: roles.length > 0 ? roles : ['BUYER'],
    ipAddress: req.ip || '',
    userAgent: req.headers['user-agent'] || '',
  });

  // Set HTTP-only cookie (8 hours)
  const maxAge = 28800; // 8 hours
  res.cookie('session', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: maxAge * 1000,
    path: '/',
  });

  res.json({
    success: true,
    data: {
      message: 'Email verified successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        roles: roles.length > 0 ? roles : ['BUYER'],
      },
    },
  });
}));

// POST /api/v1/auth/resend-verification - Resend verification code
const resendVerificationSchema = z.object({
  email: z.string().email(),
});

router.post('/resend-verification', asyncHandler(async (req, res) => {
  const body = resendVerificationSchema.parse(req.body);
  const { email } = body;

  // Find user by email
  const user = await req.prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Don't reveal if user exists for security
    return res.json({
      success: true,
      data: { message: 'If an account exists with this email, a verification code has been sent.' },
    });
  }

  // Check if already verified
  if (user.emailVerified) {
    return res.status(400).json({ success: false, error: 'Email already verified' });
  }

  // Rate limiting: don't allow resend more than once per minute
  if (user.lastVerificationSentAt) {
    const timeSinceLastSent = Date.now() - user.lastVerificationSentAt.getTime();
    if (timeSinceLastSent < 60000) {
      const secondsRemaining = Math.ceil((60000 - timeSinceLastSent) / 1000);
      return res.status(429).json({
        success: false,
        error: `Please wait ${secondsRemaining} seconds before requesting a new code.`,
      });
    }
  }

  // Generate new 6-digit verification code
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes expiry

  // Update user with new code
  await req.prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationCode: verificationCode,
      emailVerificationExpiresAt: expiresAt,
      emailVerificationAttempts: 0, // Reset attempts
      lastVerificationSentAt: new Date(),
    },
  });

  // Send verification email via Brevo
  try {
    const brevoService = new BrevoService();
    await brevoService.sendVerificationEmail(user.email, verificationCode, user.name || undefined);
  } catch (error) {
    console.error('Failed to send verification email:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('[dev] Resend verification code (email not sent):', verificationCode);
    }
    const payload: { success: false; error: string; devVerificationCode?: string } = {
      success: false,
      error:
        process.env.NODE_ENV === 'development'
          ? 'Failed to send verification email. Is BREVO_API_KEY set? Use the code below (dev only).'
          : 'Failed to send verification email. Please try again later.',
    };
    if (process.env.NODE_ENV === 'development') {
      payload.devVerificationCode = verificationCode;
    }
    return res.status(500).json(payload);
  }

  res.json({
    success: true,
    data: { message: 'Verification code sent to your email' },
  });
}));

// POST /api/v1/auth/refresh - Refresh JWT token (backward compatibility)
router.post('/refresh', asyncHandler(async (req, res) => {
  const body = refreshSchema.parse(req.body);
  const { refreshToken } = body;

  try {
    const jwt = await import('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(refreshToken, secret) as { userId: string; email: string };

    // Generate new tokens (for backward compatibility)
    const accessToken = jwt.sign({ userId: decoded.userId, email: decoded.email }, secret, { expiresIn: '15m' });
    const refreshTokenNew = jwt.sign({ userId: decoded.userId, email: decoded.email }, secret, { expiresIn: '7d' });

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: refreshTokenNew,
      },
    });
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
  }
}));

export default router;
