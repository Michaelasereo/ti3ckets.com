import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q')?.trim();
    if (!q) {
      return NextResponse.json({ success: false, error: 'Search query is required' }, { status: 400 });
    }

    const events = await prisma.event.findMany({
      where: {
        status: { in: ['PUBLISHED', 'LIVE'] },
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { venueName: { contains: q, mode: 'insensitive' } },
          { city: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: {
        ticketTypes: { select: { id: true, name: true, price: true, currency: true } },
      },
      take: 20,
    });

    return NextResponse.json({ success: true, data: events });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
