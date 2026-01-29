/**
 * NOTE: In development, this route is bypassed by Next.js rewrites that proxy
 * /api/* requests to the Fastify API server (port 8080). This route serves as
 * a fallback for production or when Fastify is unavailable.
 */
import { NextRequest, NextResponse } from 'next/server';
import { config } from '@getiickets/config';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const category = searchParams.get('category') || undefined;
    const city = searchParams.get('city') || undefined;
    const date = searchParams.get('date') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(
      config.pagination.maxLimit,
      parseInt(searchParams.get('limit') || String(config.pagination.defaultLimit), 10)
    );
    const skip = (page - 1) * limit;

    // Match backend: published/live upcoming events (no sale-window filter)
    const now = new Date();
    const where: Record<string, unknown> = {
      status: { in: ['PUBLISHED', 'LIVE'] },
      startDateTime: { gte: now },
    };
    if (category) where.category = category;
    if (city) where.city = city;
    if (date) {
      const d = new Date(date);
      where.startDateTime = {
        gte: new Date(d.setHours(0, 0, 0, 0)),
        lte: new Date(d.setHours(23, 59, 59, 999)),
      };
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          category: true,
          city: true,
          venueName: true,
          startDateTime: true,
          endDateTime: true,
          imageUrl: true,
          bannerUrl: true,
          status: true,
          ticketTypes: {
            select: {
              id: true,
              name: true,
              price: true,
              currency: true,
              totalQuantity: true,
              soldQuantity: true,
            },
            take: 5, // Limit ticket types to reduce payload
          },
          organizer: { select: { id: true, name: true } },
        },
        orderBy: { startDateTime: 'asc' },
        skip,
        take: limit,
      }),
      prisma.event.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: events,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Error fetching events:', err);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: err instanceof Error ? err.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}
