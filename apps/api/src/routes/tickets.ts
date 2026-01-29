import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { config } from '@getiickets/config';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

const availabilitySchema = z.object({
  eventId: z.string(),
  ticketTypeId: z.string(),
  quantity: z.string().transform((val) => parseInt(val, 10)),
});

const reserveSchema = z.object({
  eventId: z.string(),
  ticketTypeId: z.string(),
  quantity: z.number().int().min(1),
  seatIds: z.array(z.string()).optional(),
});

const releaseSchema = z.object({
  reservationId: z.string(),
});

// GET /api/v1/tickets/availability - Check ticket availability
router.get('/availability', asyncHandler(async (req, res) => {
  const query = availabilitySchema.parse(req.query);

  const ticketType = await req.prisma.ticketType.findUnique({
    where: {
      id: query.ticketTypeId,
      eventId: query.eventId,
    },
  });

  if (!ticketType) {
    return res.status(404).json({ success: false, error: 'Ticket type not found' });
  }

  const available = ticketType.totalQuantity - ticketType.soldQuantity - ticketType.reservedQuantity;
  const canReserve = available >= query.quantity;

  res.json({
    success: true,
    data: {
      available,
      canReserve,
      ticketType: {
        id: ticketType.id,
        name: ticketType.name,
        price: ticketType.price,
        maxPerOrder: ticketType.maxPerOrder,
      },
    },
  });
}));

// POST /api/v1/tickets/reserve - Reserve tickets
router.post('/reserve', asyncHandler(async (req, res) => {
  const body = reserveSchema.parse(req.body);
  const { eventId, ticketTypeId, quantity } = body;

  // Get ticket type
  const ticketType = await req.prisma.ticketType.findUnique({
    where: {
      id: ticketTypeId,
      eventId,
    },
  });

  if (!ticketType) {
    return res.status(404).json({ success: false, error: 'Ticket type not found' });
  }

  // Check availability
  const available = ticketType.totalQuantity - ticketType.soldQuantity - ticketType.reservedQuantity;
  if (available < quantity) {
    return res.status(400).json({ success: false, error: 'Insufficient tickets available' });
  }

  // Check max per order
  if (quantity > ticketType.maxPerOrder) {
    return res.status(400).json({ success: false, error: `Maximum ${ticketType.maxPerOrder} tickets per order` });
  }

  // Create reservation ID
  const reservationId = uuidv4();
  const expiresAt = new Date(Date.now() + config.reservation.expiryMinutes * 60 * 1000);

  // Use Redis for atomic reservation
  const redisKey = `ticket:${ticketTypeId}:available`;
  const reservationKey = `reservation:${reservationId}`;

  try {
    // Ensure Redis key exists, initialize if not
    const currentRedisValue = await req.redis.client.get(redisKey);
    if (!currentRedisValue) {
      // Initialize with current available quantity from database
      try {
        await req.redis.initializeTicketAvailability(ticketTypeId, available);
      } catch (initError) {
        console.error('Failed to initialize Redis ticket availability:', initError);
        // Continue anyway - the reserveTickets will handle it
      }
    }

    const reserved = await req.redis.reserveTickets(
      redisKey,
      reservationKey,
      quantity,
      config.reservation.expiryMinutes * 60
    );

    if (!reserved) {
      return res.status(400).json({ success: false, error: 'Insufficient tickets available. Please try again.' });
    }
  } catch (error) {
    console.error('Redis reservation error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Reservation service temporarily unavailable. Please try again.';
    
    if (error instanceof Error) {
      // Check for connection-related errors
      if (error.message.includes('connection') || error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Reservation service temporarily unavailable. Please try again in a moment.';
        console.error('Redis connection error:', {
          message: error.message,
          ticketTypeId,
          quantity,
        });
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Reservation request timed out. Please try again.';
      } else {
        console.error('Redis reservation error:', {
          message: error.message,
          stack: error.stack,
          ticketTypeId,
          quantity,
        });
      }
    }
    
    return res.status(500).json({ success: false, error: errorMessage });
  }

  // Store reservation in database
  await req.prisma.inventoryReservation.create({
    data: {
      eventId,
      ticketTypeId,
      quantity,
      reservationId,
      expiresAt,
    },
  });

  // Update reserved quantity in database
  await req.prisma.ticketType.update({
    where: { id: ticketTypeId },
    data: {
      reservedQuantity: {
        increment: quantity,
      },
    },
  });

  res.json({
    success: true,
    data: {
      reservationId,
      expiresAt: expiresAt.toISOString(),
      quantity,
      ticketTypeId,
    },
  });
}));

// POST /api/v1/tickets/release - Release reservation
router.post('/release', asyncHandler(async (req, res) => {
  const body = releaseSchema.parse(req.body);
  const { reservationId } = body;

  // Find reservation
  const reservation = await req.prisma.inventoryReservation.findUnique({
    where: { reservationId },
  });

  if (!reservation) {
    return res.status(404).json({ success: false, error: 'Reservation not found' });
  }

  if (!reservation.ticketTypeId) {
    return res.status(400).json({ success: false, error: 'Reservation has no ticket type' });
  }

  // Get ticket type for Redis key
  const ticketType = await req.prisma.ticketType.findUnique({
    where: { id: reservation.ticketTypeId },
  });

  if (!ticketType) {
    return res.status(404).json({ success: false, error: 'Ticket type not found' });
  }

  // Release from Redis
  const redisKey = `ticket:${reservation.ticketTypeId}:available`;
  const reservationKey = `reservation:${reservationId}`;
  await req.redis.releaseReservation(redisKey, reservationKey, reservation.quantity);

  // Update database
  await Promise.all([
    req.prisma.ticketType.update({
      where: { id: reservation.ticketTypeId },
      data: {
        reservedQuantity: {
          decrement: reservation.quantity,
        },
      },
    }),
    req.prisma.inventoryReservation.delete({
      where: { reservationId },
    }),
  ]);

  res.json({
    success: true,
    message: 'Reservation released',
  });
}));

export default router;
