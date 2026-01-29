import { Router } from 'express';
import { z } from 'zod';
import { PaystackService } from '../services/paystack';
import { TicketService } from '../services/ticket';
import { BrevoService } from '../services/brevo';
import { TwilioService } from '../services/twilio';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

const initializeSchema = z.object({
  orderId: z.string(),
  email: z.string().email(),
  amount: z.number(),
  metadata: z.record(z.any()).optional(),
});

const verifySchema = z.object({
  reference: z.string(),
});

const paystackService = new PaystackService();
const ticketService = new TicketService();
const brevoService = new BrevoService();
const twilioService = new TwilioService();

// POST /api/v1/payments/initialize - Initialize Paystack payment
router.post('/initialize', asyncHandler(async (req, res) => {
  const body = initializeSchema.parse(req.body);
  const { orderId, email, amount, metadata } = body;

  // Ensure database connection before querying
  try {
    await req.ensureDbConnection();
  } catch (dbError: any) {
    console.error('Database connection check failed:', dbError);
    return res.status(503).json({ success: false, error: 'Database service temporarily unavailable. Please try again in a moment.' });
  }

  // Get order
  const order = await req.prisma.order.findUnique({
    where: { id: orderId },
    include: { event: true },
  });

  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }

  if (order.status !== 'PENDING') {
    return res.status(400).json({ success: false, error: 'Order is not in pending status' });
  }

  // Handle free tickets (amount is 0) - skip Paystack
  if (amount === 0) {
    const reference = `FREE-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;
    
    // Update order with mock reference and mark as paid
    await req.prisma.order.update({
      where: { id: orderId },
      data: {
        paystackRef: reference,
        status: 'PAID',
        paymentStatus: 'success',
        paidAt: new Date(),
      },
    });

    // Generate tickets for free order (await so Orders tab shows immediately)
    try {
      await ticketService.generateTicketsForOrder(req.prisma, orderId);
      console.log(`Tickets generated for free order ${orderId}`);
    } catch (error) {
      console.error('Failed to generate tickets for free order', error);
      return res.status(500).json({ success: false, error: 'Failed to generate tickets' });
    }

    const updatedOrder = await req.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        tickets: {
          include: {
            ticketType: true,
          },
        },
        event: true,
      },
    });

    if (updatedOrder && updatedOrder.tickets.length > 0) {
      try {
        await brevoService.sendTicketConfirmation(
          updatedOrder.customerEmail,
          updatedOrder,
          updatedOrder.event
        );
      } catch (error) {
        console.error('Failed to send email for free ticket', error);
      }
      if (updatedOrder.customerPhone) {
        try {
          await twilioService.sendTicketConfirmation(
            updatedOrder.customerPhone,
            updatedOrder.orderNumber
          );
        } catch (error) {
          console.error('Failed to send SMS for free ticket', error);
        }
      }
      try {
        const organizer = await req.prisma.user.findUnique({
          where: { id: updatedOrder.event.organizerId },
          select: { email: true, name: true },
        });
        if (organizer?.email) {
          await brevoService.sendOrganizerOrderNotification(
            organizer.email,
            organizer.name ?? null,
            updatedOrder,
            updatedOrder.event
          );
        }
      } catch (err) {
        console.error('Failed to send organizer notification for free order', err);
      }
    }

    return res.json({
      success: true,
      data: {
        authorizationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/checkout/success?reference=${reference}`,
        accessCode: 'free-ticket',
        reference,
      },
    });
  }

  // Generate payment reference
  const reference = `TKT-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

  // Update order with payment reference
  await req.prisma.order.update({
    where: { id: orderId },
    data: { paystackRef: reference },
  });

  // Initialize Paystack transaction
  const amountInKobo = Math.round(amount * 100); // Convert to kobo

  try {
    const paystackResponse = await paystackService.initializeTransaction({
      email,
      amount: amountInKobo,
      reference,
      metadata: {
        orderId,
        eventId: order.eventId,
        ...metadata,
      },
      callback_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/checkout/success?reference=${reference}`,
    });

    if (!paystackResponse.status || !paystackResponse.data) {
      console.error('Paystack returned unsuccessful response:', paystackResponse);
      return res.status(500).json({ success: false, error: 'Payment initialization failed. Please try again.' });
    }

    return res.json({
      success: true,
      data: {
        authorizationUrl: paystackResponse.data.authorization_url,
        accessCode: paystackResponse.data.access_code,
        reference,
      },
    });
  } catch (error: any) {
    console.error('Paystack initialization error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Payment initialization failed. Please try again.' 
    });
  }
}));

// POST /api/v1/payments/verify - Verify payment
router.post('/verify', asyncHandler(async (req, res) => {
  const body = verifySchema.parse(req.body);
  const { reference } = body;

  // Handle free ticket references (start with "FREE-")
  if (reference.startsWith('FREE-')) {
    const order = await req.prisma.order.findUnique({
      where: { paystackRef: reference },
      include: {
        tickets: true,
        event: true,
      },
    });

    if (order && order.status === 'PAID') {
      // Generate tickets if not already generated
      if (order.tickets.length === 0) {
        try {
          console.log(`Generating tickets for free order ${order.id} via verification`);
          await ticketService.generateTicketsForOrder(req.prisma, order.id);
          
          // Get updated order with tickets
          const updatedOrder = await req.prisma.order.findUnique({
            where: { id: order.id },
            include: {
              tickets: {
                include: {
                  ticketType: true,
                },
              },
              event: true,
            },
          });

          // Send email if tickets were just generated
          if (updatedOrder && updatedOrder.tickets.length > 0) {
            try {
              console.log(`Sending confirmation email for free order ${order.id}`);
              await brevoService.sendTicketConfirmation(
                updatedOrder.customerEmail,
                updatedOrder,
                updatedOrder.event
              );
              console.log(`Email sent successfully for free order ${order.id}`);
            } catch (error) {
              console.error('Failed to send email for free ticket verification', error);
            }
            try {
              const organizer = await req.prisma.user.findUnique({
                where: { id: order.event.organizerId },
                select: { email: true, name: true },
              });
              if (organizer?.email) {
                await brevoService.sendOrganizerOrderNotification(
                  organizer.email,
                  organizer.name ?? null,
                  order,
                  order.event
                );
              }
            } catch (err) {
              console.error('Failed to send organizer notification for free order verify', err);
            }
          }
        } catch (error) {
          console.error('Failed to generate tickets for free order verification', error);
        }
      } else {
        // Tickets exist, but try to send email if it wasn't sent before
        const fullOrder = await req.prisma.order.findUnique({
          where: { id: order.id },
          include: {
            tickets: {
              include: {
                ticketType: true,
              },
            },
            event: true,
          },
        });

        if (fullOrder && fullOrder.tickets.length > 0) {
          try {
            console.log(`Attempting to send email for free order ${order.id} (tickets exist)`);
            await brevoService.sendTicketConfirmation(
              fullOrder.customerEmail,
              fullOrder,
              fullOrder.event
            );
            console.log(`Email sent successfully for free order ${order.id}`);
          } catch (error) {
            console.error('Failed to send email for free ticket (tickets exist)', error);
          }
          try {
            const organizer = await req.prisma.user.findUnique({
              where: { id: fullOrder.event.organizerId },
              select: { email: true, name: true },
            });
            if (organizer?.email) {
              await brevoService.sendOrganizerOrderNotification(
                organizer.email,
                organizer.name ?? null,
                fullOrder,
                fullOrder.event
              );
            }
          } catch (err) {
            console.error('Failed to send organizer notification for free order (tickets exist)', err);
          }
        }
      }

      return res.json({
        success: true,
        data: {
          status: 'success',
          amount: 0,
          reference,
        },
      });
    }

    return res.json({
      success: false,
      error: 'Free ticket order not found or already processed',
    });
  }

  // Verify with Paystack for paid tickets
  const paystackResponse = await paystackService.verifyTransaction(reference);

  if (paystackResponse.status && paystackResponse.data.status === 'success') {
    // Update order status
    const order = await req.prisma.order.findUnique({
      where: { paystackRef: reference },
      include: {
        tickets: true,
        event: true,
      },
    });

    // Update order status if still pending
    if (order && order.status === 'PENDING') {
      await req.prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          paymentStatus: 'success',
          paidAt: new Date(),
        },
      });
    }

    // Generate tickets if not already generated (works for both PENDING and PAID orders)
    // This ensures tickets are generated even if webhook already marked order as PAID
    if (order && order.tickets.length === 0) {
      try {
        console.log(`Generating tickets for order ${order.id} via payment verification`);
        await ticketService.generateTicketsForOrder(req.prisma, order.id);
        
        // Get updated order with tickets
        const updatedOrder = await req.prisma.order.findUnique({
          where: { id: order.id },
          include: {
            tickets: {
              include: {
                ticketType: true,
              },
            },
            event: true,
          },
        });

        // Send email if tickets were just generated
        if (updatedOrder && updatedOrder.tickets.length > 0) {
          try {
            console.log(`Sending confirmation email for order ${order.id}`);
            await brevoService.sendTicketConfirmation(
              updatedOrder.customerEmail,
              updatedOrder,
              updatedOrder.event
            );
            console.log(`Email sent successfully for order ${order.id}`);
          } catch (error) {
            console.error('Failed to send email in payment verification', error);
          }

          // Send SMS if phone provided
          if (updatedOrder.customerPhone) {
            try {
              await twilioService.sendTicketConfirmation(
                updatedOrder.customerPhone,
                updatedOrder.orderNumber
              );
            } catch (error) {
              console.error('Failed to send SMS in payment verification', error);
            }
          }

          // Notify organizer of new order
          try {
            const organizer = await req.prisma.user.findUnique({
              where: { id: updatedOrder.event.organizerId },
              select: { email: true, name: true },
            });
            if (organizer?.email) {
              await brevoService.sendOrganizerOrderNotification(
                organizer.email,
                organizer.name ?? null,
                updatedOrder,
                updatedOrder.event
              );
            }
          } catch (err) {
            console.error('Failed to send organizer notification in payment verify', err);
          }
        }
      } catch (error) {
        console.error('Failed to generate tickets in payment verification', error);
      }
    } else if (order && order.tickets.length > 0) {
      // Tickets exist but email might not have been sent (webhook might have failed)
      // Check if we should resend email (optional - you might want to add a flag to track if email was sent)
      console.log(`Order ${order.id} already has ${order.tickets.length} tickets`);
      
      // Get full order with event for email sending
      const fullOrder = await req.prisma.order.findUnique({
        where: { id: order.id },
        include: {
          tickets: {
            include: {
              ticketType: true,
            },
          },
          event: true,
        },
      });

      // Try to send email if order exists and has tickets
      if (fullOrder && fullOrder.tickets.length > 0) {
        try {
          console.log(`Attempting to send email for order ${order.id} (tickets already exist)`);
          await brevoService.sendTicketConfirmation(
            fullOrder.customerEmail,
            fullOrder,
            fullOrder.event
          );
          console.log(`Email sent successfully for order ${order.id}`);
        } catch (error) {
          console.error('Failed to send email in payment verification (tickets exist)', error);
        }
        try {
          const organizer = await req.prisma.user.findUnique({
            where: { id: fullOrder.event.organizerId },
            select: { email: true, name: true },
          });
          if (organizer?.email) {
            await brevoService.sendOrganizerOrderNotification(
              organizer.email,
              organizer.name ?? null,
              fullOrder,
              fullOrder.event
            );
          }
        } catch (err) {
          console.error('Failed to send organizer notification (tickets exist)', err);
        }
      }
    }

    return res.json({
      success: true,
      data: {
        status: 'success',
        amount: paystackResponse.data.amount / 100, // Convert from kobo
        reference,
      },
    });
  }

  return res.json({
    success: false,
    error: 'Payment verification failed',
  });
}));

export default router;
