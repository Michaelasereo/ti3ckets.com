import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole, ApiError } from '@/lib/auth';
import { prisma } from '@/lib/db';

const bodySchema = z.object({
  amount: z.number().positive(),
  recipientCode: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireRole(request, 'ORGANIZER');
    const body = await request.json();
    const { amount } = bodySchema.parse(body);

    const payout = await prisma.payout.create({
      data: {
        organizerId: user.userId,
        amount,
        currency: 'NGN',
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      success: true,
      data: payout,
      message: 'Payout request submitted. Processing depends on Paystack transfer integration.',
    });
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
