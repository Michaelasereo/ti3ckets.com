import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole, ApiError } from '@/lib/auth';
import { prisma } from '@/lib/db';

const updateSchema = z
  .object({
    code: z.string().transform((v) => v.toUpperCase()).optional(),
    description: z.string().optional(),
    discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
    discountValue: z.number().positive().optional(),
    maxUses: z.number().int().positive().optional(),
    maxUsesPerUser: z.number().int().positive().optional(),
    validFrom: z.string().transform((v) => new Date(v)).optional(),
    validUntil: z.string().transform((v) => new Date(v)).optional(),
    eventId: z.string().optional(),
    minOrderAmount: z.number().positive().optional(),
    isActive: z.boolean().optional(),
  })
  .partial();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(request, 'ORGANIZER');
    const { id } = await params;

    const organizerEvents = await prisma.event.findMany({
      where: { organizerId: user.userId },
      select: { id: true },
    });
    const eventIds = organizerEvents.map((e) => e.id);

    const promoCode = await prisma.promoCode.findFirst({
      where: {
        id,
        OR: [{ eventId: null }, { eventId: { in: eventIds } }],
      },
      include: { event: { select: { id: true, title: true, slug: true } } },
    });

    if (!promoCode) {
      return NextResponse.json({ success: false, error: 'Promo code not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: promoCode });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(request, 'ORGANIZER');
    const { id } = await params;
    const body = await request.json();
    const data = updateSchema.parse(body);

    const organizerEvents = await prisma.event.findMany({
      where: { organizerId: user.userId },
      select: { id: true },
    });
    const eventIds = organizerEvents.map((e) => e.id);

    const existing = await prisma.promoCode.findFirst({
      where: {
        id,
        OR: [{ eventId: null }, { eventId: { in: eventIds } }],
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Promo code not found' }, { status: 404 });
    }

    if (data.code && data.code !== existing.code) {
      const codeExists = await prisma.promoCode.findUnique({
        where: { code: data.code },
      });
      if (codeExists) {
        return NextResponse.json({ success: false, error: 'Promo code already exists' }, { status: 400 });
      }
    }

    if (data.eventId) {
      const event = await prisma.event.findFirst({
        where: { id: data.eventId, organizerId: user.userId },
      });
      if (!event) {
        return NextResponse.json({ success: false, error: 'You do not own this event' }, { status: 403 });
      }
    }

    const promoCode = await prisma.promoCode.update({
      where: { id },
      data,
      include: { event: { select: { id: true, title: true, slug: true } } },
    });

    return NextResponse.json({ success: true, data: promoCode });
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(request, 'ORGANIZER');
    const { id } = await params;

    const organizerEvents = await prisma.event.findMany({
      where: { organizerId: user.userId },
      select: { id: true },
    });
    const eventIds = organizerEvents.map((e) => e.id);

    const existing = await prisma.promoCode.findFirst({
      where: {
        id,
        OR: [{ eventId: null }, { eventId: { in: eventIds } }],
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Promo code not found' }, { status: 404 });
    }

    await prisma.promoCode.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Promo code deleted' });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
