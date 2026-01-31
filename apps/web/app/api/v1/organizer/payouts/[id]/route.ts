import { NextResponse } from 'next/server';
import { requireRole, ApiError } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(request, 'ORGANIZER');
    const { id } = await params;

    const payout = await prisma.payout.findFirst({
      where: { id, organizerId: user.userId },
    });

    if (!payout) {
      return NextResponse.json({ success: false, error: 'Payout not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: payout });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
