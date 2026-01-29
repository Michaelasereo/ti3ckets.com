/**
 * NOTE: In development, this route is bypassed by Next.js rewrites that proxy
 * /api/* requests to the Fastify API server (port 8080). This route serves as
 * a fallback for production or when Fastify is unavailable.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { slugify } from '@getiickets/shared';
import { prisma } from '@/lib/db';
import { requireAuth, ApiError } from '@/lib/auth';

const createEventSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  category: z.string(),
  venueName: z.string(),
  venueAddress: z.string(),
  city: z.string(),
  country: z.string().default('Nigeria'),
  startDateTime: z.string().transform((v) => new Date(v)),
  endDateTime: z.string().transform((v) => new Date(v)),
  saleStart: z.string().transform((v) => new Date(v)),
  saleEnd: z.string().transform((v) => new Date(v)),
  isSeated: z.boolean().default(false),
  isVirtual: z.boolean().default(false),
  ticketTypes: z.array(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      price: z.number(),
      currency: z.string().default('NGN'),
      totalQuantity: z.number().int().min(1),
      maxPerOrder: z.number().int().default(4),
      minPerOrder: z.number().int().default(1),
    })
  ),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const events = await prisma.event.findMany({
      where: { organizerId: user.userId },
      include: {
        ticketTypes: true,
        _count: { select: { orders: true, tickets: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: events });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const parsed = createEventSchema.parse(body);
    const { ticketTypes, ...eventData } = parsed;

    const baseSlug = slugify(parsed.title);
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.event.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter += 1;
    }

    const event = await prisma.event.create({
      data: {
        ...eventData,
        slug,
        organizerId: user.userId,
        status: 'DRAFT',
        ticketTypes: { create: ticketTypes },
      },
      include: { ticketTypes: true },
    });

    return NextResponse.json({ success: true, data: event });
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
