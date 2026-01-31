import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { requireRole, ApiError } from '@/lib/auth';
import { prisma } from '@/lib/db';

const patchSchema = z.object({ suspended: z.boolean() });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, 'ADMIN');
    const { id } = await params;
    const body = await request.json();
    const { suspended } = patchSchema.parse(body);

    const accountLockedUntil = suspended
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      : null;

    const user = await prisma.user.update({
      where: { id },
      data: {
        accountLockedUntil,
        failedLoginAttempts: accountLockedUntil ? 999 : 0,
      },
    });

    return NextResponse.json({ success: true, data: user });
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
