import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { SessionService } from '@/lib/session';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'No session found' }, { status: 401 });
    }

    const sessionService = new SessionService();
    const session = await sessionService.getSession(sessionId);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Session expired or invalid' }, { status: 401 });
    }

    const userId = session.userId;

    const existingRole = await prisma.userRole.findUnique({
      where: {
        userId_role: {
          userId,
          role: Role.ORGANIZER,
        },
      },
    });

    if (existingRole) {
      return NextResponse.json({
        success: true,
        data: { message: 'User already has ORGANIZER role' },
      });
    }

    await prisma.userRole.create({
      data: {
        userId,
        role: Role.ORGANIZER,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    await prisma.organizerProfile.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        businessName: user?.name || 'My Business',
        verificationStatus: 'VERIFIED',
        onboardingCompleted: false,
      },
    });

    const updatedRoles = [...session.roles, 'ORGANIZER'];
    await sessionService.updateSessionRoles(sessionId, updatedRoles);

    return NextResponse.json({
      success: true,
      data: {
        message: 'ORGANIZER role granted successfully',
        roles: updatedRoles,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
