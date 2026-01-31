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
          select: { totalAmount: true, createdAt: true },
        },
        ticketTypes: {
          select: { id: true, name: true, price: true, soldQuantity: true },
        },
      },
    });

    const totalRevenue = events.reduce(
      (sum, e) => sum + e.orders.reduce((s, o) => s + Number(o.totalAmount), 0),
      0
    );

    const eventRevenue = events.map((event) => {
      const eventTotal = event.orders.reduce((s, o) => s + Number(o.totalAmount), 0);
      const ticketsSold = event.ticketTypes.reduce((s, tt) => s + tt.soldQuantity, 0);
      return {
        eventId: event.id,
        eventTitle: event.title,
        revenue: eventTotal,
        ticketsSold,
        ticketTypes: event.ticketTypes.map((tt) => ({
          id: tt.id,
          name: tt.name,
          price: Number(tt.price),
          sold: tt.soldQuantity,
          revenue: Number(tt.price) * tt.soldQuantity,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        summary: { totalRevenue },
        events: eventRevenue,
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
