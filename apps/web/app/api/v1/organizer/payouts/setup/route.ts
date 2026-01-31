import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole, ApiError } from '@/lib/auth';
import { prisma } from '@/lib/db';

const bodySchema = z.object({
  name: z.string().min(1),
  account_number: z.string().min(10).max(10),
  bank_code: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const user = await requireRole(request, 'ORGANIZER');
    const body = await request.json();
    const data = bodySchema.parse(body);

    const profile = await prisma.organizerProfile.findUnique({
      where: { userId: user.userId },
    });

    if (!profile) {
      return NextResponse.json({ success: false, error: 'Organizer profile not found' }, { status: 404 });
    }

    await prisma.organizerProfile.update({
      where: { userId: user.userId },
      data: {
        payoutDetails: {
          name: data.name,
          account_number: data.account_number,
          bank_code: data.bank_code,
        },
      },
    });

    return NextResponse.json({ success: true, data: { message: 'Payout details updated' } });
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
