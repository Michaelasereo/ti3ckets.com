import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { requireRole, ApiError } from '@/lib/auth';
import { prisma } from '@/lib/db';

const postSchema = z.object({ role: z.nativeEnum(Role) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireRole(request, 'ADMIN');
    const { id: userId } = await params;
    const body = await request.json();
    const { role } = postSchema.parse(body);

    const existing = await prisma.userRole.findFirst({
      where: { userId, role },
    });
    if (existing) {
      return NextResponse.json({ success: true, data: existing });
    }

    const userRole = await prisma.userRole.create({
      data: { userId, role, grantedBy: adminUser.userId },
    });

    return NextResponse.json({ success: true, data: userRole });
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
