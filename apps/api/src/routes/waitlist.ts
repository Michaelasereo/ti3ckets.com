import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

const joinWaitlistSchema = z.object({
  eventId: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  ticketTypeId: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
});

// POST /api/v1/waitlist - Join waitlist
router.post('/', asyncHandler(async (req, res) => {
  const body = joinWaitlistSchema.parse(req.body);
  const { eventId, email, phone, ticketTypeId, quantity } = body;

  // Check if event exists
  const event = await req.prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found' });
  }

  // Check if already on waitlist
  const existing = await req.prisma.waitlist.findFirst({
    where: {
      eventId,
      email,
      ...(ticketTypeId ? { ticketTypeId } : { ticketTypeId: null }),
    },
  });

  if (existing) {
    return res.json({
      success: true,
      message: 'You are already on the waitlist',
      data: existing,
    });
  }

  // Add to waitlist
  const waitlistEntry = await req.prisma.waitlist.create({
    data: {
      eventId,
      email,
      phone,
      ticketTypeId: ticketTypeId || null,
      quantity,
    },
  });

  res.json({
    success: true,
    message: 'Added to waitlist. You will be notified when tickets become available.',
    data: waitlistEntry,
  });
}));

export default router;
