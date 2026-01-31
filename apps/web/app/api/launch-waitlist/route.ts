import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const bodySchema = z.object({
  firstName: z.string().min(1, 'First name is required').transform((s) => s.trim()),
  email: z.string().email('Please enter a valid email address').transform((s) => s.trim().toLowerCase()),
});

// In-memory rate limit: max 5 attempts per IP per 15 minutes
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_ATTEMPTS = 5;
const ipAttempts = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  let entry = ipAttempts.get(ip);
  if (!entry) {
    ipAttempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true };
  }
  if (now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + RATE_WINDOW_MS };
    ipAttempts.set(ip, entry);
    return { allowed: true };
  }
  entry.count += 1;
  if (entry.count > RATE_MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { allowed: true };
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rate = checkRateLimit(ip);
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: rate.retryAfterSeconds ? { 'Retry-After': String(rate.retryAfterSeconds) } : undefined }
      );
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? 'Validation failed';
      return NextResponse.json({ success: false, error: msg }, { status: 400 });
    }

    const { firstName, email } = parsed.data;

    const existing = await prisma.launchWaitlistEntry.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "You're already on the list." },
        { status: 409 }
      );
    }

    await prisma.launchWaitlistEntry.create({
      data: { firstName, email },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err: unknown) {
    console.error('[launch-waitlist]', err);
    const prismaErr = err as { code?: string; meta?: { table_name?: string } };
    const isTableMissing =
      prismaErr?.code === 'P2021' ||
      (typeof (err as Error)?.message === 'string' && (err as Error).message?.includes('does not exist'));
    const errorMessage =
      process.env.NODE_ENV === 'development' && isTableMissing
        ? 'Waitlist table is missing. Run: cd apps/web && npx prisma migrate deploy'
        : 'Something went wrong. Please try again.';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
