import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { generateOrderNumber } from '@getiickets/shared';
import { config } from '@getiickets/config';
import { asyncHandler } from '../middleware/asyncHandler';
import { BrevoService } from '../services/brevo';
import { TicketService } from '../services/ticket';
import { TwilioService } from '../services/twilio';

const router = Router();
const brevoService = new BrevoService();
const ticketService = new TicketService();
const twilioService = new TwilioService();

const createOrderSchema = z.object({
  eventId: z.string(),
  ticketTypeId: z.string(),
  quantity: z.number().int().min(1),
  customerEmail: z.string().email(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  promoCode: z.string().optional(),
  reservationId: z.string().optional(),
  attendeeInfo: z.array(z.object({
    ticketTypeId: z.string(),
    quantity: z.number(),
    attendees: z.array(z.object({
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().email(),
      phone: z.string().optional(),
    })),
  })).optional(),
});

// POST /api/v1/orders - Create order
router.post('/', asyncHandler(async (req, res) => {
  const body = createOrderSchema.parse(req.body);
  const { eventId, ticketTypeId, quantity, customerEmail, customerName, customerPhone, promoCode, reservationId, attendeeInfo } = body;

  // Ensure database connection before querying
  try {
    await req.ensureDbConnection();
  } catch (dbError: any) {
    console.error('Database connection check failed:', dbError);
    return res.status(503).json({ success: false, error: 'Database service temporarily unavailable. Please try again in a moment.' });
  }

  // Get event and ticket type
  const [event, ticketType] = await Promise.all([
    req.prisma.event.findUnique({ where: { id: eventId } }),
    req.prisma.ticketType.findUnique({ where: { id: ticketTypeId } }),
  ]);

  if (!event || !ticketType) {
    return res.status(404).json({ success: false, error: 'Event or ticket type not found' });
  }

  // Calculate pricing
  let subtotal = Number(ticketType.price) * quantity;
  let discountAmount = 0;

  // Apply promo code if provided
  if (promoCode) {
    const promo = await req.prisma.promoCode.findUnique({
      where: { code: promoCode },
    });

    if (promo && promo.isActive) {
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

  // Calculate fees (skip fees for free tickets)
  let platformFee = 0;
  let processingFee = 0;
  let totalAmount = subtotal;
  
  if (subtotal > 0) {
    platformFee = (subtotal * config.payment.platformFeePercent) / 100;
    processingFee = (subtotal * config.payment.processingFeePercent) / 100 + config.payment.processingFeeFixed;
    totalAmount = subtotal + platformFee + processingFee;
  }

  // Determine order status - auto-mark as PAID if total is 0 (free tickets)
  const orderStatus = totalAmount === 0 ? 'PAID' : 'PENDING';

  // Prepare metadata with attendee info if provided
  const metadata = attendeeInfo ? { attendeeInfo } : undefined;

  // Create order
  const order = await req.prisma.order.create({
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
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'],
      metadata: metadata as any,
    },
  });

  // Link reservation if provided
  if (reservationId) {
    await req.prisma.inventoryReservation.updateMany({
      where: { reservationId },
      data: { orderId: order.id },
    });
  }

  let paystackRef: string | undefined;

  // Free order: set paystackRef, generate tickets, send customer confirmation email
  if (orderStatus === 'PAID') {
    paystackRef = `FREE-${order.id}-${uuidv4().substring(0, 8).toUpperCase()}`;
    await req.prisma.order.update({
      where: { id: order.id },
      data: { paystackRef },
    });

    try {
      await ticketService.generateTicketsForOrder(req.prisma, order.id);
    } catch (err) {
      console.error('Failed to generate tickets for free order', err);
      return res.status(500).json({ success: false, error: 'Failed to generate tickets' });
    }

    const fullOrder = await req.prisma.order.findUnique({
      where: { id: order.id },
      include: {
        tickets: { include: { ticketType: true } },
        event: true,
      },
    });

    if (fullOrder && fullOrder.tickets.length > 0) {
      try {
        await brevoService.sendTicketConfirmation(
          fullOrder.customerEmail,
          fullOrder,
          fullOrder.event
        );
      } catch (err) {
        console.error('Failed to send customer confirmation email for free order', err);
      }
      if (fullOrder.customerPhone) {
        try {
          await twilioService.sendTicketConfirmation(
            fullOrder.customerPhone,
            fullOrder.orderNumber
          );
        } catch (err) {
          console.error('Failed to send SMS for free order', err);
        }
      }
    }

    try {
      const organizer = await req.prisma.user.findUnique({
        where: { id: event.organizerId },
        select: { email: true, name: true },
      });
      if (organizer?.email) {
        await brevoService.sendOrganizerOrderNotification(
          organizer.email,
          organizer.name ?? null,
          order,
          event
        );
      }
    } catch (err) {
      console.error('Failed to send organizer notification on order create', err);
    }
  }

  res.json({
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
}));

// GET /api/v1/orders/by-reference/:reference - Get order by payment reference
router.get('/by-reference/:reference', asyncHandler(async (req, res) => {
  const { reference } = req.params;

  const order = await req.prisma.order.findUnique({
    where: { paystackRef: reference },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          startDateTime: true,
          endDateTime: true,
          venueName: true,
          venueAddress: true,
          city: true,
          imageUrl: true,
          bannerUrl: true,
        },
      },
      tickets: {
        include: {
          ticketType: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              currency: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }

  res.json({
    success: true,
    data: order,
  });
}));

// GET /api/v1/orders/:id - Get order details
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await req.prisma.order.findUnique({
    where: { id },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          startDateTime: true,
          endDateTime: true,
          venueName: true,
          venueAddress: true,
          city: true,
          imageUrl: true,
          bannerUrl: true,
        },
      },
      tickets: {
        include: {
          ticketType: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              currency: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }

  res.json({
    success: true,
    data: order,
  });
}));

export default router;
