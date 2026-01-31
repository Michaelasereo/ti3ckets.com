import { NextResponse } from 'next/server';
import { requireRole, ApiError } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const user = await requireRole(request, 'ORGANIZER');

    const events = await prisma.event.findMany({
      where: { organizerId: user.userId },
      include: {
        orders: {
          where: { status: 'PAID' },
          select: { totalAmount: true },
        },
      },
    });

    const totalRevenue = events.reduce(
      (sum, e) => sum + e.orders.reduce((s, o) => s + Number(o.totalAmount), 0),
      0
    );

    const pendingPayouts = await prisma.payout.aggregate({
      where: { organizerId: user.userId, status: 'PENDING' },
      _sum: { amount: true },
    });
    const pendingAmount = Number(pendingPayouts._sum.amount ?? 0);

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        pendingPayouts: pendingAmount,
        availableBalance: Math.max(0, totalRevenue - pendingAmount),
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
