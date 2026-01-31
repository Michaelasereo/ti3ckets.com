import { NextResponse } from 'next/server';
import { requireRole, ApiError } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, 'ADMIN');
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        roles: { select: { role: true, grantedAt: true } },
        buyerProfile: true,
        organizerProfile: true,
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { event: { select: { id: true, title: true, slug: true } } },
        },
        events: { take: 10, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, slug: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        roles: user.roles.map((r) => r.role),
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
