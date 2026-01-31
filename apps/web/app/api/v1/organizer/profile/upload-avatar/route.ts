import { NextResponse } from 'next/server';
import { requireRole, ApiError } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    await requireRole(request, 'ORGANIZER');
    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No avatar file provided' }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Avatar upload not implemented in Next.js API. Use PUT /api/v1/users/me/profile with organizerProfile.avatarUrl.',
      },
      { status: 501 }
    );
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
