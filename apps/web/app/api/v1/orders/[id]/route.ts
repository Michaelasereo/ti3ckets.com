import { NextResponse } from 'next/server';
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        event: { select: eventSelect },
        tickets: {
          include: {
            ticketType: { select: ticketTypeSelect },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
