/**
 * Register: proxy to Express API when API_URL is set (dev + production with API).
 * Express handles verification emails. This route is only hit when rewrites don't
 * apply (e.g. production with rewrites disabled). If API_URL is unset, we skip
 * proxy and use the no-email fallback (create user + session).
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { SessionService } from '@/lib/session';
import { Role } from '@prisma/client';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  phone: z.string().optional(),
});

export async function POST(request: Request) {
  const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  if (apiUrl) {
    try {
      const base = apiUrl.replace(/\/$/, '');
      const res = await fetch(`${base}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': request.headers.get('user-agent') || 'Next',
          'X-Forwarded-For': request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      const next = NextResponse.json(data, { status: res.status });
      const setCookie = res.headers.get('set-cookie');
      if (setCookie) {
        next.headers.append('Set-Cookie', setCookie);
      }
      return next;
    } catch (err) {
      console.error('Register proxy to API failed:', err);
      return NextResponse.json(
        { success: false, error: 'Auth service unavailable. Ensure the API server is running.' },
        { status: 503 }
      );
    }
  }

  try {
    const { email, password, name, phone } = registerSchema.parse(body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'User already exists' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const nameParts = name?.split(' ') || [];
    const firstName = nameParts[0] || null;
    const lastName = nameParts.slice(1).join(' ') || null;

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        phone: phone?.trim() || null,
        roles: { create: { role: Role.BUYER } },
        buyerProfile: { create: { firstName, lastName } },
      },
      select: { id: true, email: true, name: true, phone: true, createdAt: true },
    });

    const sessionService = new SessionService();
    const sessionId = await sessionService.createSession({
      userId: user.id,
      email: user.email,
      roles: ['BUYER'],
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
    });

    const response = NextResponse.json({
      success: true,
      data: { user: { ...user, roles: ['BUYER'] } },
    });
    response.cookies.set('session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 28800,
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
