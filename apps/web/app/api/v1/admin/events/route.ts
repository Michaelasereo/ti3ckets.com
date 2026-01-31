import { NextResponse } from 'next/server';
import { EventStatus } from '@prisma/client';
import { requireRole, ApiError } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    await requireRole(request, 'ADMIN');
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;
    const status = searchParams.get('status') as EventStatus | undefined;
    const organizerId = searchParams.get('organizerId') || undefined;
    const search = searchParams.get('search') || undefined;

    const where: { status?: EventStatus; organizerId?: string; OR?: Array<{ title?: unknown; description?: unknown; city?: unknown }> } = {};
    if (status) where.status = status;
    if (organizerId) where.organizerId = organizerId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        include: {
          organizer: { select: { id: true, email: true, name: true } },
          _count: { select: { orders: true, tickets: true, ticketTypes: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.event.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        events,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
