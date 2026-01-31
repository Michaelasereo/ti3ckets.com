import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole, ApiError } from '@/lib/auth';
import { prisma } from '@/lib/db';

const createSchema = z.object({
  code: z.string().transform((v) => v.toUpperCase()),
  description: z.string().optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.number().positive(),
  maxUses: z.number().int().positive().optional(),
  maxUsesPerUser: z.number().int().positive().default(1),
  validFrom: z.string().transform((v) => new Date(v)),
  validUntil: z.string().transform((v) => new Date(v)),
  eventId: z.string().optional(),
  minOrderAmount: z.number().positive().optional(),
  isActive: z.boolean().default(true),
});

const updateSchema = createSchema.partial();

export async function GET(request: Request) {
  try {
    const user = await requireRole(request, 'ORGANIZER');

    const organizerEvents = await prisma.event.findMany({
      where: { organizerId: user.userId },
      select: { id: true },
    });
    const eventIds = organizerEvents.map((e) => e.id);

    const promoCodes = await prisma.promoCode.findMany({
      where: {
        OR: [{ eventId: null }, { eventId: { in: eventIds } }],
      },
      include: {
        event: { select: { id: true, title: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: promoCodes });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(request, 'ORGANIZER');
    const body = await request.json();
    const data = createSchema.parse(body);

    if (data.eventId) {
      const event = await prisma.event.findFirst({
        where: { id: data.eventId, organizerId: user.userId },
      });
      if (!event) {
        return NextResponse.json({ success: false, error: 'You do not own this event' }, { status: 403 });
      }
    }

    const existing = await prisma.promoCode.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Promo code already exists' }, { status: 400 });
    }

    const promoCode = await prisma.promoCode.create({
      data: {
        ...data,
        currentUses: 0,
      },
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
