import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole, ApiError } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, 'ADMIN');
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        organizerProfile: true,
        roles: { select: { role: true } },
        events: { select: { id: true, title: true, slug: true, status: true, startDateTime: true } },
      },
    });

    if (!user || !user.organizerProfile) {
      return NextResponse.json({ success: false, error: 'Organizer not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { ...user, roles: user.roles.map((r) => r.role) },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

const patchSchema = z.object({
  verificationStatus: z.enum(['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED']),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, 'ADMIN');
    const { id } = await params;
    const body = await request.json();
    const { verificationStatus } = patchSchema.parse(body);

    const profile = await prisma.organizerProfile.findUnique({
      where: { userId: id },
    });

    if (!profile) {
      return NextResponse.json({ success: false, error: 'Organizer not found' }, { status: 404 });
    }

    await prisma.organizerProfile.update({
      where: { userId: id },
      data: {
        verificationStatus,
        ...(verificationStatus === 'VERIFIED' ? { verifiedAt: new Date() } : {}),
      },
    });

    return NextResponse.json({ success: true, data: { message: 'Updated' } });
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
