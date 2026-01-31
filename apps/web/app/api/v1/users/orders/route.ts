import { NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/auth';
import { prisma } from '@/lib/db';

const eventSelect = {
  id: true,
  title: true,
  slug: true,
  startDateTime: true,
  venueName: true,
  city: true,
  imageUrl: true,
};

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    const orders = await prisma.order.findMany({
      where: {
        OR: [{ userId: user.userId }, { customerEmail: user.email }],
      },
      include: {
        event: { select: eventSelect },
        tickets: {
          select: {
            id: true,
            ticketNumber: true,
            status: true,
          },
        },
        _count: { select: { tickets: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
