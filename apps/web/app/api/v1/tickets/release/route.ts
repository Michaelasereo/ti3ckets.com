import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const bodySchema = z.object({
  reservationId: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reservationId } = bodySchema.parse(body);

    const reservation = await prisma.inventoryReservation.findUnique({
      where: { reservationId },
    });

    if (!reservation) {
      return NextResponse.json({ success: false, error: 'Reservation not found' }, { status: 404 });
    }

    if (!reservation.ticketTypeId) {
      return NextResponse.json({ success: false, error: 'Reservation has no ticket type' }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.ticketType.update({
        where: { id: reservation.ticketTypeId },
        data: { reservedQuantity: { decrement: reservation.quantity } },
      }),
      prisma.inventoryReservation.delete({
        where: { reservationId },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Reservation released',
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation error', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
