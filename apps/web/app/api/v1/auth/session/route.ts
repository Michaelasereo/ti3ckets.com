import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionService } from '@/lib/session';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'No session found' }, { status: 401 });
    }

    const sessionService = new SessionService();
    const session = await sessionService.getSession(sessionId);

    if (!session) {
      const response = NextResponse.json({ success: false, error: 'Session expired or invalid' }, { status: 401 });
      response.cookies.set('session', '', { path: '/', maxAge: 0 });
      return response;
    }

    // Check inactivity timeout
    const now = Math.floor(Date.now() / 1000);
    const maxAge = session.roles.includes('ORGANIZER') ? 7200 : 28800;
    if (now - session.lastActivity > maxAge) {
      await sessionService.deleteSession(sessionId);
      const response = NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 });
      response.cookies.set('session', '', { path: '/', maxAge: 0 });
      return response;
    }

    await sessionService.updateActivity(sessionId);

    return NextResponse.json({
      success: true,
      data: {
        userId: session.userId,
        email: session.email,
        roles: session.roles,
        activeRole: session.activeRole,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
