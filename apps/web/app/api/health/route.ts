import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: { database: 'connected' },
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
