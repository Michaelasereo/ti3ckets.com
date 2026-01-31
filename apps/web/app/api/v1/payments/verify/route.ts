import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { PaystackService } from '@/lib/paystack';
import { generateTicketsForOrder } from '@/lib/ticket';

const bodySchema = z.object({
  reference: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reference } = bodySchema.parse(body);

    if (reference.startsWith('FREE-')) {
      const order = await prisma.order.findUnique({
        where: { paystackRef: reference },
        include: { tickets: true, event: true },
      });

      if (order?.status === 'PAID') {
        if (order.tickets.length === 0) {
          try {
            await generateTicketsForOrder(prisma, order.id);
          } catch (err) {
            console.error('Failed to generate tickets for free order verify', err);
          }
        }
        return NextResponse.json({
          success: true,
          data: { status: 'success', amount: 0, reference },
        });
      }
      return NextResponse.json({
        success: false,
        error: 'Free ticket order not found or already processed',
      });
    }

    const paystackService = new PaystackService();
    const paystackResponse = await paystackService.verifyTransaction(reference);

    if (!paystackResponse?.status || paystackResponse?.data?.status !== 'success') {
      return NextResponse.json({ success: false, error: 'Payment verification failed' });
    }

    const order = await prisma.order.findUnique({
      where: { paystackRef: reference },
      include: { tickets: true, event: true },
    });

    if (order?.status === 'PENDING') {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          paymentStatus: 'success',
          paidAt: new Date(),
        },
      });
    }

    if (order && order.tickets.length === 0) {
      try {
        await generateTicketsForOrder(prisma, order.id);
      } catch (err) {
        console.error('Failed to generate tickets in payment verify', err);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        status: 'success',
        amount: (paystackResponse.data?.amount ?? 0) / 100,
        reference,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation error', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Payment verification failed' },
      { status: 500 }
    );
  }
}
