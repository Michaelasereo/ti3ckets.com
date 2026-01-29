import { Router } from 'express';
import { PaystackService } from '../services/paystack';
import { TicketService } from '../services/ticket';
import { BrevoService } from '../services/brevo';
import { TwilioService } from '../services/twilio';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

const paystackService = new PaystackService();
const ticketService = new TicketService();
const brevoService = new BrevoService();
const twilioService = new TwilioService();

// POST /api/v1/webhooks/paystack - Paystack webhook handler
// Note: express.raw() middleware is applied in app.ts for all webhook routes
router.post('/paystack', asyncHandler(async (req, res) => {
  const signature = req.headers['x-paystack-signature'] as string;

  if (!signature) {
    return res.status(400).json({ success: false, error: 'Missing signature' });
  }

  // Verify webhook signature
  const isValid = paystackService.verifyWebhookSignature(req.body, signature);
  
  if (!isValid) {
    return res.status(401).json({ success: false, error: 'Invalid signature' });
  }

  // Parse body (it's a Buffer from express.raw())
  const body = JSON.parse(req.body.toString());
  const event = body.event;
  const data = body.data;

  try {
    if (event === 'charge.success') {
      // Find order by payment reference
      const order = await req.prisma.order.findUnique({
        where: { paystackRef: data.reference },
        include: {
          event: true,
          tickets: true,
        },
      });

      if (!order) {
        console.error(`Order not found for reference: ${data.reference}`);
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      // Only process if order is still pending
      if (order.status !== 'PENDING') {
        console.log(`Order ${order.id} already processed`);
        return res.json({ success: true, message: 'Order already processed' });
      }

      // Update order status
      await req.prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          paymentStatus: 'success',
          paidAt: new Date(),
        },
      });

      // Generate tickets if not already generated
      if (order.tickets.length === 0) {
        await ticketService.generateTicketsForOrder(req.prisma, order.id);
      }

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

      if (updatedOrder) {
        // Send confirmation email
        try {
          console.log(`Sending confirmation email for order ${updatedOrder.id} via webhook`);
          await brevoService.sendTicketConfirmation(
            updatedOrder.customerEmail,
            updatedOrder,
            updatedOrder.event
          );
          console.log(`Email sent successfully for order ${updatedOrder.id}`);
        } catch (error) {
          console.error('Failed to send email via webhook', error);
          // Don't fail the webhook if email fails - tickets are already generated
        }

        // Send SMS confirmation if phone provided
        if (updatedOrder.customerPhone) {
          try {
            await twilioService.sendTicketConfirmation(
              updatedOrder.customerPhone,
              updatedOrder.orderNumber
            );
          } catch (error) {
            console.error('Failed to send SMS via webhook', error);
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
          console.error('Failed to send organizer notification via webhook', err);
        }
      }

      return res.json({ success: true, message: 'Webhook processed successfully' });
    } else if (event === 'charge.failed') {
      // Handle failed payment
      const order = await req.prisma.order.findUnique({
        where: { paystackRef: data.reference },
      });

      if (order && order.status === 'PENDING') {
        await req.prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'FAILED',
            paymentStatus: 'failed',
          },
        });

        // Release reservations
        const reservations = await req.prisma.inventoryReservation.findMany({
          where: { orderId: order.id },
        });

        for (const reservation of reservations) {
          await req.redis.releaseReservation(
            `ticket:${reservation.ticketTypeId}:available`,
            `reservation:${reservation.reservationId}`,
            reservation.quantity
          );
        }
      }
    } else if (event === 'transfer.success' || event === 'transfer.failed' || event === 'transfer.reversed') {
      // Handle payout transfer status updates
      const reference = data?.reference || data?.transfer_code;
      if (!reference) {
        return res.json({ success: true, message: 'No transfer reference found' });
      }

      const payout = await req.prisma.payout.findFirst({
        where: { paystackRef: reference },
      });

      // If no payout matched, just acknowledge to avoid retries
      if (!payout) {
        return res.json({ success: true, message: 'No matching payout found' });
      }

      if (event === 'transfer.success') {
        await req.prisma.payout.update({
          where: { id: payout.id },
          data: {
            status: 'COMPLETED',
            processedAt: new Date(),
          },
        });
      } else {
        const failureReason =
          event === 'transfer.reversed'
            ? 'Transfer reversed by processor'
            : 'Transfer failed';
        await req.prisma.payout.update({
          where: { id: payout.id },
          data: {
            status: 'FAILED',
            failureReason: data?.reason || data?.message || failureReason,
            processedAt: new Date(),
          },
        });
      }
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}));

export default router;
