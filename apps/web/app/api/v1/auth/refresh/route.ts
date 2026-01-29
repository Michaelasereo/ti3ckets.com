/**
 * NOTE: In development, this route is bypassed by Next.js rewrites that proxy
 * /api/* requests to the Fastify API server (port 8080). This route serves as
 * a fallback for production or when Fastify is unavailable.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import jwt from 'jsonwebtoken';

const refreshSchema = z.object({ refreshToken: z.string() });

function generateTokens(userId: string, email: string) {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  const accessToken = jwt.sign({ userId, email }, secret, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId, email }, secret, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { refreshToken } = refreshSchema.parse(body);

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(refreshToken, secret) as { userId: string; email: string };

    const tokens = generateTokens(decoded.userId, decoded.email);

    return NextResponse.json({ success: true, data: tokens });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation error' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Invalid or expired refresh token' }, { status: 401 });
  }
}
