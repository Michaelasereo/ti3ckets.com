/**
 * NOTE: In development, this route is bypassed by Next.js rewrites that proxy
 * /api/* requests to the Fastify API server (port 8080). This route serves as
 * a fallback for production or when Fastify is unavailable.
 * 
 * To use Fastify API in dev, ensure API_URL is set in .env.local and Fastify
 * is running on port 8080. The rewrite in next.config.js will handle proxying.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { SessionService } from '@/lib/session';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      // Increment failed login attempts
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: {
            increment: 1,
          },
        },
      });
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    // Load user roles from database
    const userRoles = await prisma.userRole.findMany({
      where: { userId: user.id },
      select: { role: true },
    });
    const roles = userRoles.map(ur => ur.role);

    // Create session
    const sessionService = new SessionService();
    const sessionId = await sessionService.createSession({
      userId: user.id,
      email: user.email,
      roles: roles.length > 0 ? roles : ['BUYER'],
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
    });

    // Update user last login and reset failed attempts
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
      },
    });

    // Set HTTP-only cookie
    const maxAge = roles.includes('ORGANIZER') ? 7200 : 28800; // 2 hours for organizers, 8 hours for buyers
    const response = NextResponse.json({
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

    response.cookies.set('session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge,
      path: '/',
    });

    return response;
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation error', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
