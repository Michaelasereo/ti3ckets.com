import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PaystackService } from '@/lib/paystack';
import { generateTicketsForOrder } from '@/lib/ticket';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const signature = request.headers.get('x-paystack-signature');
  if (!signature) {
    return NextResponse.json({ success: false, error: 'Missing signature' }, { status: 400 });
  }

  const rawBody = await request.text();
  let paystackService: PaystackService;
  try {
    paystackService = new PaystackService();
  } catch {
    return NextResponse.json({ success: false, error: 'Webhook not configured' }, { status: 503 });
  }

  const isValid = paystackService.verifyWebhookSignature(rawBody, signature);
  if (!isValid) {
    return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 });
  }

  let body: { event?: string; data?: { reference?: string } };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const event = body.event;
  const data = body.data;

  if (event === 'charge.success' && data?.reference) {
    const order = await prisma.order.findUnique({
      where: { paystackRef: data.reference },
      include: { tickets: true },
    });

    if (!order) {
      console.error(`Webhook: order not found for reference ${data.reference}`);
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    if (order.status !== 'PENDING') {
      return NextResponse.json({ success: true, message: 'Order already processed' });
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        paymentStatus: 'success',
        paidAt: new Date(),
      },
    });

    if (order.tickets.length === 0) {
      try {
        await generateTicketsForOrder(prisma, order.id);
      } catch (err) {
        console.error('Webhook: failed to generate tickets', err);
      }
    }
  }

  return NextResponse.json({ success: true });
}
