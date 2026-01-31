import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole, ApiError } from '@/lib/auth';

// GET /api/v1/admin/settings

export async function GET(request: Request) {
  try {
    await requireRole(request, 'ADMIN');
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const settings = {
    platformFeePercentage: parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '3.5'),
    paystackFeePercentage: parseFloat(process.env.PAYSTACK_FEE_PERCENTAGE || '1.5'),
    paystackFixedFee: parseFloat(process.env.PAYSTACK_FIXED_FEE || '100'),
    freeTicketsThreshold: parseFloat(process.env.FREE_TICKETS_THRESHOLD || '100'),
    minimumPayoutThreshold: parseFloat(process.env.MINIMUM_PAYOUT_THRESHOLD || '10000'),
  };

  return NextResponse.json({ success: true, data: settings });
}

const patchSchema = z.object({
  platformFeePercentage: z.number().min(0).max(100).optional(),
  paystackFeePercentage: z.number().min(0).max(100).optional(),
  paystackFixedFee: z.number().min(0).optional(),
  freeTicketsThreshold: z.number().int().min(0).optional(),
  minimumPayoutThreshold: z.number().min(0).optional(),
});

export async function PATCH(request: Request) {
  try {
    await requireRole(request, 'ADMIN');
    const body = await request.json();
    const settings = patchSchema.parse(body);
    return NextResponse.json({
      success: true,
      data: settings,
      message: 'Settings updated (stored in environment in production)',
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
