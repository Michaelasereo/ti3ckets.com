import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const RESERVATION_EXPIRY_MINUTES = 15;

const bodySchema = z.object({
  eventId: z.string(),
  ticketTypeId: z.string(),
  quantity: z.number().int().min(1),
  seatIds: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { eventId, ticketTypeId, quantity } = bodySchema.parse(body);

    const ticketType = await prisma.ticketType.findUnique({
      where: { id: ticketTypeId, eventId },
    });

    if (!ticketType) {
      return NextResponse.json({ success: false, error: 'Ticket type not found' }, { status: 404 });
    }

    const available =
      ticketType.totalQuantity - ticketType.soldQuantity - ticketType.reservedQuantity;
    if (available < quantity) {
      return NextResponse.json({ success: false, error: 'Insufficient tickets available' }, { status: 400 });
    }
    if (quantity > ticketType.maxPerOrder) {
      return NextResponse.json({ success: false, error: `Maximum ${ticketType.maxPerOrder} tickets per order` }, { status: 400 });
    }

    const reservationId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + RESERVATION_EXPIRY_MINUTES * 60 * 1000);

    await prisma.$transaction([
      prisma.inventoryReservation.create({
        data: {
          eventId,
          ticketTypeId,
          quantity,
          reservationId,
          expiresAt,
        },
      }),
      prisma.ticketType.update({
        where: { id: ticketTypeId },
        data: { reservedQuantity: { increment: quantity } },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        reservationId,
        expiresAt: expiresAt.toISOString(),
        quantity,
        ticketTypeId,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation error', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
