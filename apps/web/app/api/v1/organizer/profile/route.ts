import { NextResponse } from 'next/server';
import { requireRole, ApiError } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const user = await requireRole(request, 'ORGANIZER');

    const profile = await prisma.organizerProfile.findUnique({
      where: { userId: user.userId },
    });

    if (!profile) {
      return NextResponse.json({ success: false, error: 'Organizer profile not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: profile });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
