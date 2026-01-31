import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { BrevoService } from '@/lib/brevo';

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = bodySchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({
        success: true,
        data: { message: 'If an account exists with this email, a verification code has been sent.' },
      });
    }

    if (user.emailVerified) {
      return NextResponse.json({ success: false, error: 'Email already verified' }, { status: 400 });
    }

    if (user.lastVerificationSentAt) {
      const timeSinceLastSent = Date.now() - user.lastVerificationSentAt.getTime();
      if (timeSinceLastSent < 60000) {
        const secondsRemaining = Math.ceil((60000 - timeSinceLastSent) / 1000);
        return NextResponse.json({
          success: false,
          error: `Please wait ${secondsRemaining} seconds before requesting a new code.`,
        }, { status: 429 });
      }
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationCode: verificationCode,
        emailVerificationExpiresAt: expiresAt,
        emailVerificationAttempts: 0,
        lastVerificationSentAt: new Date(),
      },
    });

    try {
      const brevoService = new BrevoService();
      await brevoService.sendVerificationEmail(user.email, verificationCode, user.name || undefined);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      if (process.env.NODE_ENV === 'development') {
        console.log('[dev] Verification code (email not sent):', verificationCode);
      }
      return NextResponse.json({
        success: false,
        error: process.env.NODE_ENV === 'development'
          ? 'Failed to send verification email. Is BREVO_API_KEY set?'
          : 'Failed to send verification email. Please try again later.',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Verification code sent to your email' },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation error', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
