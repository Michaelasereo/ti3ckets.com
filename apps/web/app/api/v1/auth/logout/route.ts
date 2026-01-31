import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionService } from '@/lib/session';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (sessionId) {
      const sessionService = new SessionService();
      await sessionService.deleteSession(sessionId);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('session', '', {
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch {
    return NextResponse.json({ success: true });
  }
}
