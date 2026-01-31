import { NextResponse } from 'next/server';
import { requireRole, ApiError } from '@/lib/auth';
import { prisma } from '@/lib/db';

function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: Request) {
  try {
    await requireRole(request, 'ADMIN');

    const entries = await prisma.launchWaitlistEntry.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const header = 'First Name,Email,Signed up at';
    const rows = entries.map((e) => {
      const signedUpAt = new Date(e.createdAt).toISOString();
      return [escapeCsvValue(e.firstName), escapeCsvValue(e.email), escapeCsvValue(signedUpAt)].join(',');
    });
    const csv = [header, ...rows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="launch-waitlist.csv"',
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
