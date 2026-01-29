/**
 * NOTE: In development, this route is bypassed by Next.js rewrites that proxy
 * /api/* requests to the Fastify API server (port 8080). This route serves as
 * a fallback for production or when Fastify is unavailable.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, ApiError } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        roles: {
          select: {
            role: true,
            grantedAt: true,
          },
        },
        buyerProfile: true,
        organizerProfile: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        emailVerified: true,
        createdAt: true,
        roles: {
          select: {
            role: true,
            grantedAt: true,
          },
        },
        buyerProfile: true,
        organizerProfile: true,
      },
    });

    if (!userData) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...userData,
        roles: userData.roles.map((r) => r.role),
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
