import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/debug/verification-code?email=user@example.com
 * Dev-only: returns the current 6-digit verification code for the given email.
 * Use this when Brevo is not configured or you don't have access to the inbox.
 * Disabled in production (returns 404).
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email')?.trim();
  if (!email) {
    return NextResponse.json(
      { error: 'Missing email. Use: /api/debug/verification-code?email=you@example.com' },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      emailVerified: true,
      emailVerificationCode: true,
      emailVerificationExpiresAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'No user found with this email' }, { status: 404 });
  }
  if (user.emailVerified) {
    return NextResponse.json({ message: 'Email already verified', code: null });
  }
  if (!user.emailVerificationCode || !user.emailVerificationExpiresAt) {
    return NextResponse.json({ error: 'No pending verification code. Request a new one from the verify-email page.' }, { status: 404 });
  }
  if (new Date() > user.emailVerificationExpiresAt) {
    return NextResponse.json({ error: 'Code expired. Request a new one from the verify-email page.' }, { status: 400 });
  }

  return NextResponse.json({
    email: user.email,
    code: user.emailVerificationCode,
    expiresAt: user.emailVerificationExpiresAt.toISOString(),
  });
}
