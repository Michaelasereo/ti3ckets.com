import { NextResponse } from 'next/server';
import { requireRole, ApiError } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    await requireRole(request, 'ADMIN');
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;
    const verificationStatus = searchParams.get('verificationStatus') || undefined;

    const where = verificationStatus
      ? { organizerProfile: { verificationStatus: verificationStatus as 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED' } }
      : {};

    const [organizers, total] = await Promise.all([
      prisma.user.findMany({
        where: { organizerProfile: { isNot: null }, ...where },
        skip,
        take: limit,
        include: {
          organizerProfile: true,
          _count: { select: { events: true, orders: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where: { organizerProfile: { isNot: null }, ...where } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        organizers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
