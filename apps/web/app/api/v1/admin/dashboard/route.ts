import { NextResponse } from 'next/server';
import { requireRole, ApiError } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getPlatformStats } from '@/lib/services/admin';

export async function GET(request: Request) {
  try {
    await requireRole(request, 'ADMIN');
    const stats = await getPlatformStats(prisma);
    return NextResponse.json({ success: true, data: stats });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
