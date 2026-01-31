import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { PaystackService } from '@/lib/paystack';
import { generateTicketsForOrder } from '@/lib/ticket';

const bodySchema = z.object({
  orderId: z.string(),
  email: z.string().email(),
  amount: z.number(),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, email, amount, metadata } = bodySchema.parse(body);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { event: true },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    if (order.status !== 'PENDING') {
      return NextResponse.json({ success: false, error: 'Order is not in pending status' }, { status: 400 });
    }

    const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000';

    if (amount === 0) {
      const reference = `FREE-${Date.now()}-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paystackRef: reference,
          status: 'PAID',
          paymentStatus: 'success',
          paidAt: new Date(),
        },
      });

      try {
        await generateTicketsForOrder(prisma, orderId);
      } catch (err) {
        console.error('Failed to generate tickets for free order', err);
        return NextResponse.json({ success: false, error: 'Failed to generate tickets' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: {
          authorizationUrl: `${frontendUrl}/checkout/success?reference=${reference}`,
          accessCode: 'free-ticket',
          reference,
        },
      });
    }

    const reference = `TKT-${Date.now()}-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;

    await prisma.order.update({
      where: { id: orderId },
      data: { paystackRef: reference },
    });

    const paystackService = new PaystackService();
    const amountInKobo = Math.round(amount * 100);

    const paystackResponse = await paystackService.initializeTransaction({
      email,
      amount: amountInKobo,
      reference,
      metadata: {
        orderId,
        eventId: order.eventId,
        ...metadata,
      },
      callback_url: `${frontendUrl}/checkout/success?reference=${reference}`,
    });

    const data = paystackResponse?.data;
    if (!paystackResponse?.status || !data) {
      return NextResponse.json(
        { success: false, error: 'Payment initialization failed. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        authorizationUrl: data.authorization_url,
        accessCode: data.access_code,
        reference,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation error', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Payment initialization failed' },
      { status: 500 }
    );
  }
}
