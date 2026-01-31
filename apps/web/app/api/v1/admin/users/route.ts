import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { requireRole, ApiError } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    await requireRole(request, 'ADMIN');
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;
    const role = searchParams.get('role') as Role | undefined;
    const search = searchParams.get('search') || undefined;

    const where: { roles?: { some: { role: Role } }; OR?: Array<{ email?: unknown; name?: unknown; phone?: unknown }> } = {};
    if (role) {
      where.roles = { some: { role } };
    }
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          roles: { select: { role: true } },
          buyerProfile: { select: { id: true, createdAt: true } },
          organizerProfile: { select: { id: true, verificationStatus: true, businessName: true } },
          _count: { select: { orders: true, events: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        users: users.map((u) => ({
          ...u,
          roles: u.roles.map((r) => r.role),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
