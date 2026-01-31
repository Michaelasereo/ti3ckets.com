import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { BrevoService } from '@/lib/brevo';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  phone: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, phone } = registerSchema.parse(body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'User already exists' }, { status: 400 });
    }

    const normalizedPhone = phone?.trim() || null;
    if (normalizedPhone) {
      const existingPhoneUser = await prisma.user.findUnique({
        where: { phone: normalizedPhone },
      });
      if (existingPhoneUser) {
        return NextResponse.json({ success: false, error: 'Phone number already registered' }, { status: 400 });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const nameParts = name?.split(' ') || [];
    const firstName = nameParts[0] || null;
    const lastName = nameParts.slice(1).join(' ') || null;

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        phone: normalizedPhone,
        emailVerified: false,
        emailVerificationCode: verificationCode,
        emailVerificationExpiresAt: expiresAt,
        lastVerificationSentAt: new Date(),
        roles: {
          create: { role: Role.BUYER },
        },
        buyerProfile: {
          create: { firstName, lastName },
        },
      },
      select: { id: true, email: true, name: true, phone: true, createdAt: true },
    });

    let emailSent = false;
    try {
      const brevoService = new BrevoService();
      await brevoService.sendVerificationEmail(user.email, verificationCode, user.name || undefined);
      emailSent = true;
    } catch (error) {
      console.error('Failed to send verification email:', error);
      if (process.env.NODE_ENV === 'development') {
        console.log('[dev] Verification code (email not sent):', verificationCode);
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          message: emailSent
            ? 'Account created. Please check your email for verification code.'
            : "Account created. We couldn't send the verification email. Please use \"Resend code\" to receive it.",
          email: user.email,
          requiresVerification: true,
          emailSent,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation error', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
