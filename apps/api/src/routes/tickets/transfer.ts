import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { BrevoService } from '../../services/brevo';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();

const transferSchema = z.object({
  ticketId: z.string(),
  recipientEmail: z.string().email(),
  recipientName: z.string().optional(),
});

const brevoService = new BrevoService();

// POST /api/v1/tickets/:id/transfer - Transfer ticket
router.post(
  '/:id/transfer',
  asyncHandler(authenticate),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const body = transferSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Get ticket
    const ticket = await req.prisma.ticket.findUnique({
      where: { id },
      include: {
        order: true,
        event: true,
      },
    });

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    // Verify ownership (check order user or ticket attendee email)
    const order = ticket.order;
    if (order.userId !== userId && order.customerEmail !== req.user?.email) {
      return res.status(403).json({ success: false, error: 'You do not own this ticket' });
    }

    // Check if ticket can be transferred
    if (ticket.status !== 'VALID') {
      return res.status(400).json({ success: false, error: 'Ticket cannot be transferred' });
    }

    // Update ticket
    const updatedTicket = await req.prisma.ticket.update({
      where: { id },
      data: {
        attendeeEmail: body.recipientEmail,
        attendeeName: body.recipientName,
        transferredFrom: order.customerEmail,
        transferredAt: new Date(),
        status: 'TRANSFERRED',
      },
    });

    // Send email notification
    await brevoService.sendTicketConfirmation(
      body.recipientEmail,
      order,
      ticket.event
    );

    res.json({
      success: true,
      data: {
        ticket: updatedTicket,
        message: 'Ticket transferred successfully',
      },
    });
  })
);

export default router;
