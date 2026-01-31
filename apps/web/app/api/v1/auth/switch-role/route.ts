import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { SessionService } from '@/lib/session';

const bodySchema = z.object({
  role: z.enum(['buyer', 'organizer']),
});

export async function POST(request: Request) {
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

    const body = await request.json();
    const { role } = bodySchema.parse(body);

    if (role === 'organizer' && !session.roles.includes('ORGANIZER')) {
      return NextResponse.json({ success: false, error: 'User does not have ORGANIZER role' }, { status: 403 });
    }

    await sessionService.updateActiveRole(sessionId, role);

    return NextResponse.json({
      success: true,
      data: { message: 'Role switched successfully' },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation error', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
