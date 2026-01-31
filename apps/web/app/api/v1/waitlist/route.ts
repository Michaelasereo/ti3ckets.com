import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const bodySchema = z.object({
  eventId: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  ticketTypeId: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { eventId, email, phone, ticketTypeId, quantity } = bodySchema.parse(body);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    const existing = await prisma.waitlist.findFirst({
      where: {
        eventId,
        email,
        ...(ticketTypeId ? { ticketTypeId } : { ticketTypeId: null }),
      },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'You are already on the waitlist',
        data: existing,
      });
    }

    const waitlistEntry = await prisma.waitlist.create({
      data: {
        eventId,
        email,
        phone: phone ?? null,
        ticketTypeId: ticketTypeId ?? null,
        quantity,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Added to waitlist. You will be notified when tickets become available.',
      data: waitlistEntry,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation error', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
