import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, ApiError } from '@/lib/auth';
import { prisma } from '@/lib/db';

const bodySchema = z.object({
  recipientEmail: z.string().email(),
  recipientName: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { ticketId } = await params;
    const body = await request.json();
    const { recipientEmail, recipientName } = bodySchema.parse(body);

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { order: true, event: true },
    });

    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
    }

    const order = ticket.order;
    const isOwner = order.userId === user.userId || order.customerEmail === user.email;
    if (!isOwner) {
      return NextResponse.json({ success: false, error: 'You do not own this ticket' }, { status: 403 });
    }

    if (ticket.status !== 'VALID') {
      return NextResponse.json({ success: false, error: 'Ticket cannot be transferred' }, { status: 400 });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        attendeeEmail: recipientEmail,
        attendeeName: recipientName ?? undefined,
        transferredFrom: order.customerEmail,
        transferredAt: new Date(),
        status: 'TRANSFERRED',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ticket: updatedTicket,
        message: 'Ticket transferred successfully',
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation error', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
