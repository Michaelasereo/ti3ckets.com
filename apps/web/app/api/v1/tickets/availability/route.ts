import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const querySchema = z.object({
  eventId: z.string(),
  ticketTypeId: z.string(),
  quantity: z.string().transform((val) => parseInt(val, 10)),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      eventId: searchParams.get('eventId'),
      ticketTypeId: searchParams.get('ticketTypeId'),
      quantity: searchParams.get('quantity'),
    });

    const ticketType = await prisma.ticketType.findUnique({
      where: {
        id: query.ticketTypeId,
        eventId: query.eventId,
      },
    });

    if (!ticketType) {
      return NextResponse.json({ success: false, error: 'Ticket type not found' }, { status: 404 });
    }

    const available =
      ticketType.totalQuantity - ticketType.soldQuantity - ticketType.reservedQuantity;
    const canReserve = available >= query.quantity;

    return NextResponse.json({
      success: true,
      data: {
        available,
        canReserve,
        ticketType: {
          id: ticketType.id,
          name: ticketType.name,
          price: ticketType.price,
          maxPerOrder: ticketType.maxPerOrder,
        },
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation error', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
