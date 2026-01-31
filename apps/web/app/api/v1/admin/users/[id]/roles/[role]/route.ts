import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { requireRole, ApiError } from '@/lib/auth';
import { prisma } from '@/lib/db';

const validRoles = Object.values(Role);

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; role: string }> }
) {
  try {
    await requireRole(request, 'ADMIN');
    const { id: userId, role } = await params;

    if (!validRoles.includes(role as Role)) {
      return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
    }

    await prisma.userRole.deleteMany({
      where: { userId, role: role as Role },
    });

    return NextResponse.json({ success: true, message: 'Role revoked successfully' });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
