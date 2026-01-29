import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, ApiError } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request);
    const id = params.id;

    // Use parallel queries with aggregations instead of loading all orders/tickets
    const [event, revenueData, ticketCount, orderCount, ticketTypes] = await Promise.all([
      prisma.event.findFirst({
        where: { id, organizerId: user.userId },
        select: { id: true, title: true, status: true },
      }),
      prisma.order.aggregate({
        where: { eventId: id, status: 'PAID' },
        _sum: { totalAmount: true },
      }),
      prisma.ticket.count({
        where: { order: { eventId: id, status: 'PAID' } },
      }),
      prisma.order.count({
        where: { eventId: id, status: 'PAID' },
      }),
      prisma.ticketType.findMany({
        where: { eventId: id },
        select: { totalQuantity: true, soldQuantity: true },
      }),
    ]);

    if (!event) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    const totalRevenue = Number(revenueData._sum.totalAmount || 0);
    const available = ticketTypes.reduce((sum, tt) => sum + (Number(tt.totalQuantity) - Number(tt.soldQuantity)), 0);

    return NextResponse.json({
      success: true,
      data: {
        event: { id: event.id, title: event.title, status: event.status },
        revenue: { total: totalRevenue, currency: 'NGN' },
        tickets: { sold: ticketCount, available },
        orders: { total: orderCount, paid: orderCount },
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
