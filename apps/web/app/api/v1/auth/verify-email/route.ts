import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { SessionService } from '@/lib/session';

const bodySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, code } = bodySchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ success: false, error: 'Email already verified' }, { status: 400 });
    }

    if (!user.emailVerificationCode || !user.emailVerificationExpiresAt) {
      return NextResponse.json({ success: false, error: 'No verification code found. Please request a new one.' }, { status: 400 });
    }

    if (new Date() > user.emailVerificationExpiresAt) {
      return NextResponse.json({ success: false, error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
    }

    if (user.emailVerificationAttempts >= 5) {
      return NextResponse.json({ success: false, error: 'Too many verification attempts. Please request a new code.' }, { status: 429 });
    }

    if (user.emailVerificationCode !== code) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationAttempts: { increment: 1 },
        },
      });
      const attempts = (user.emailVerificationAttempts ?? 0) + 1;
      const remaining = 5 - attempts;
      return NextResponse.json({
        success: false,
        error: `Invalid verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Please request a new code.'}`,
      }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        emailVerificationCode: null,
        emailVerificationExpiresAt: null,
        emailVerificationAttempts: 0,
      },
    });

    const userRoles = await prisma.userRole.findMany({
      where: { userId: user.id },
      select: { role: true },
    });
    const roles = userRoles.map((ur) => ur.role);

    const sessionService = new SessionService();
    const sessionId = await sessionService.createSession({
      userId: user.id,
      email: user.email,
      roles: roles.length > 0 ? roles : ['BUYER'],
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
    });

    const maxAge = 28800;
    const response = NextResponse.json({
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
