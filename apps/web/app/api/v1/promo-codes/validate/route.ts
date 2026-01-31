import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const bodySchema = z.object({
  code: z.string(),
  eventId: z.string(),
  amount: z.number(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, eventId, amount } = bodySchema.parse(body);

    const promoCode = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!promoCode) {
      return NextResponse.json({ success: false, error: 'Promo code not found' }, { status: 404 });
    }

    if (!promoCode.isActive) {
      return NextResponse.json({ success: false, error: 'Promo code is not active' }, { status: 400 });
    }

    const now = new Date();
    if (now < promoCode.validFrom || now > promoCode.validUntil) {
      return NextResponse.json({ success: false, error: 'Promo code has expired' }, { status: 400 });
    }

    if (promoCode.eventId && promoCode.eventId !== eventId) {
      return NextResponse.json({ success: false, error: 'Promo code not valid for this event' }, { status: 400 });
    }

    if (promoCode.minOrderAmount && amount < Number(promoCode.minOrderAmount)) {
      return NextResponse.json({
        success: false,
        error: `Minimum order amount is ${promoCode.minOrderAmount}`,
      }, { status: 400 });
    }

    if (promoCode.maxUses != null && promoCode.currentUses >= promoCode.maxUses) {
      return NextResponse.json({ success: false, error: 'Promo code has reached maximum uses' }, { status: 400 });
    }

    let discountAmount = 0;
    if (promoCode.discountType === 'PERCENTAGE') {
      discountAmount = (amount * Number(promoCode.discountValue)) / 100;
    } else {
      discountAmount = Number(promoCode.discountValue);
    }
    discountAmount = Math.min(discountAmount, amount);

    return NextResponse.json({
      success: true,
      data: {
        code: promoCode.code,
        discountType: promoCode.discountType,
        discountValue: Number(promoCode.discountValue),
        discountAmount,
        finalAmount: amount - discountAmount,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation error', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
