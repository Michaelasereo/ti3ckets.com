import { NextResponse } from 'next/server';
import { z } from 'zod';
import { EventStatus } from '@prisma/client';
import { requireRole, ApiError } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, 'ADMIN');
    const { id } = await params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        organizer: { select: { id: true, email: true, name: true } },
        ticketTypes: true,
        _count: { select: { orders: true, tickets: true } },
      },
    });

    if (!event) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: event });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

const patchSchema = z.object({ status: z.nativeEnum(EventStatus) });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, 'ADMIN');
    const { id } = await params;
    const body = await request.json();
    const { status } = patchSchema.parse(body);

    await prisma.event.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ success: true, data: { message: 'Updated' } });
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
