import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { config } from '@getiickets/config';
import { generateOrderNumber } from '@getiickets/shared';
import { prisma } from '@/lib/db';
import { generateTicketsForOrder } from '@/lib/ticket';

const createOrderSchema = z.object({
  eventId: z.string(),
  ticketTypeId: z.string(),
  quantity: z.number().int().min(1),
  customerEmail: z.string().email(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  promoCode: z.string().optional(),
  reservationId: z.string().optional(),
  attendeeInfo: z
    .array(
      z.object({
        ticketTypeId: z.string(),
        quantity: z.number(),
        attendees: z.array(
          z.object({
            firstName: z.string(),
            lastName: z.string(),
            email: z.string().email(),
            phone: z.string().optional(),
          })
        ),
      })
    )
    .optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createOrderSchema.parse(body);
    const {
      eventId,
      ticketTypeId,
      quantity,
      customerEmail,
      customerName,
      customerPhone,
      promoCode,
      reservationId,
      attendeeInfo,
    } = parsed;

    const [event, ticketType] = await Promise.all([
      prisma.event.findUnique({ where: { id: eventId } }),
      prisma.ticketType.findUnique({ where: { id: ticketTypeId } }),
    ]);

    if (!event || !ticketType) {
      return NextResponse.json({ success: false, error: 'Event or ticket type not found' }, { status: 404 });
    }

    let subtotal = Number(ticketType.price) * quantity;
    let discountAmount = 0;

    if (promoCode) {
      const promo = await prisma.promoCode.findUnique({
        where: { code: promoCode },
      });
      if (promo?.isActive) {
        const now = new Date();
        if (now >= promo.validFrom && now <= promo.validUntil) {
          if (promo.discountType === 'PERCENTAGE') {
            discountAmount = (subtotal * Number(promo.discountValue)) / 100;
          } else {
            discountAmount = Number(promo.discountValue);
          }
          subtotal -= discountAmount;
          if (subtotal < 0) subtotal = 0;
        }
      }
    }

    let platformFee = 0;
    let processingFee = 0;
    let totalAmount = subtotal;
    if (subtotal > 0) {
      platformFee = (subtotal * config.payment.platformFeePercent) / 100;
      processingFee =
        (subtotal * config.payment.processingFeePercent) / 100 + config.payment.processingFeeFixed;
      totalAmount = subtotal + platformFee + processingFee;
    }

    const orderStatus = totalAmount === 0 ? 'PAID' : 'PENDING';
    const metadata = attendeeInfo ? { attendeeInfo } : undefined;

    const order = await prisma.order.create({
      data: {
        eventId,
        customerEmail,
        customerName,
        customerPhone,
        orderNumber: generateOrderNumber(),
        totalAmount,
        currency: ticketType.currency,
        promoCode,
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
        status: orderStatus,
        paymentStatus: orderStatus === 'PAID' ? 'success' : undefined,
        paidAt: orderStatus === 'PAID' ? new Date() : undefined,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
        userAgent: request.headers.get('user-agent') || null,
        metadata: metadata as object | undefined,
      },
    });

    if (reservationId) {
      await prisma.inventoryReservation.updateMany({
        where: { reservationId },
        data: { orderId: order.id },
      });
    }

    let paystackRef: string | undefined;

    if (orderStatus === 'PAID') {
      paystackRef = `FREE-${order.id}-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
      await prisma.order.update({
        where: { id: order.id },
        data: { paystackRef },
      });
      try {
        await generateTicketsForOrder(prisma, order.id);
      } catch (err) {
        console.error('Failed to generate tickets for free order', err);
        return NextResponse.json({ success: false, error: 'Failed to generate tickets' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount: Number(order.totalAmount),
        currency: order.currency,
        customerEmail: order.customerEmail,
        ...(paystackRef !== undefined && { paystackRef }),
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation error', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
