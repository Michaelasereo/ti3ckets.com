import { NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/auth';
import { prisma } from '@/lib/db';

const eventSelect = {
  id: true,
  title: true,
  slug: true,
  startDateTime: true,
  endDateTime: true,
  venueName: true,
  venueAddress: true,
  city: true,
  imageUrl: true,
  bannerUrl: true,
};

const ticketTypeSelect = {
  id: true,
  name: true,
  description: true,
  price: true,
  currency: true,
};

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    const tickets = await prisma.ticket.findMany({
      where: {
        OR: [
          { order: { userId: user.userId } },
          { order: { customerEmail: user.email } },
        ],
      },
      include: {
        event: { select: eventSelect },
        ticketType: { select: ticketTypeSelect },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            currency: true,
            createdAt: true,
          },
        },
        seat: {
          select: {
            id: true,
            section: true,
            row: true,
            number: true,
            tier: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: tickets,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
