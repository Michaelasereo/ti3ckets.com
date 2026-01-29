import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        ticketTypes: { orderBy: { price: 'asc' } },
        organizer: { select: { id: true, name: true, email: true } },
      },
    });

    if (!event) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    let seats: unknown[] = [];
    if (event.isSeated) {
      seats = await prisma.seat.findMany({
        where: {
          eventId: event.id,
          status: { in: ['AVAILABLE', 'RESERVED'] },
        },
        orderBy: [{ section: 'asc' }, { row: 'asc' }, { number: 'asc' }],
        take: 2000,
      });
    }

    return NextResponse.json({
      success: true,
      data: { ...event, seats },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
