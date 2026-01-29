import { Router } from 'express';
import { z } from 'zod';
import { requireRoleMiddleware } from '../middleware/auth';
import { Role } from '@prisma/client';
import { slugify } from '@getiickets/shared';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string(),
  imageUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
  venueName: z.string().min(1),
  venueAddress: z.string().min(1),
  city: z.string(),
  country: z.string(),
  startDateTime: z.string().transform((val) => new Date(val)),
  endDateTime: z.string().transform((val) => new Date(val)),
  saleStart: z.string().transform((val) => new Date(val)),
  saleEnd: z.string().transform((val) => new Date(val)),
  isSeated: z.boolean().default(false),
  isVirtual: z.boolean().default(false),
  ticketTypes: z.array(
    z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      price: z.number().min(0),
      currency: z.string().default('NGN'),
      totalQuantity: z.number().int().min(1),
      maxPerOrder: z.number().int().min(1).default(4),
      minPerOrder: z.number().int().min(1).default(1),
    })
  ),
}).superRefine((val, ctx) => {
  const now = new Date();
  if (val.endDateTime <= val.startDateTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'endDateTime must be after startDateTime',
      path: ['endDateTime'],
    });
  }
  if (val.startDateTime < now) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'startDateTime cannot be in the past',
      path: ['startDateTime'],
    });
  }
  if (val.saleEnd < val.saleStart) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'saleEnd must be after saleStart',
      path: ['saleEnd'],
    });
  }
  if (val.saleEnd > val.startDateTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'saleEnd cannot be after the event startDateTime',
      path: ['saleEnd'],
    });
  }

  val.ticketTypes.forEach((tt, i) => {
    if (tt.maxPerOrder < tt.minPerOrder) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'maxPerOrder must be greater than or equal to minPerOrder',
        path: ['ticketTypes', i, 'maxPerOrder'],
      });
    }
  });
});

const updateEventSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  imageUrl: z.string().url().optional().nullable(),
  bannerUrl: z.string().url().optional().nullable(),
  venueName: z.string().optional(),
  venueAddress: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  startDateTime: z.string().transform((val) => new Date(val)).optional(),
  endDateTime: z.string().transform((val) => new Date(val)).optional(),
  saleStart: z.string().transform((val) => new Date(val)).optional(),
  saleEnd: z.string().transform((val) => new Date(val)).optional(),
  isSeated: z.boolean().optional(),
  isVirtual: z.boolean().optional(),
  ticketTypes: z.array(
    z.object({
      id: z.string().optional(), // For updating existing
      name: z.string().min(1),
      description: z.string().optional(),
      price: z.number().min(0),
      currency: z.string().default('NGN'),
      totalQuantity: z.number().int().min(1),
      maxPerOrder: z.number().int().min(1).default(4),
      minPerOrder: z.number().int().min(1).default(1),
    })
  ).optional(),
});

const statusUpdateSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED', 'LIVE', 'SOLD_OUT', 'CANCELLED', 'COMPLETED']),
});

// GET /api/v1/organizer/events - Get organizer's events
router.get('/events', requireRoleMiddleware(Role.ORGANIZER), asyncHandler(async (req, res) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const events = await req.prisma.event.findMany({
    where: { organizerId: userId },
    include: {
      ticketTypes: true,
      _count: {
        select: {
          orders: true,
          tickets: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  res.json({
    success: true,
    data: events,
  });
}));

// GET /api/v1/organizer/events/:id - Get single event
router.get('/events/:id', requireRoleMiddleware(Role.ORGANIZER), asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const event = await req.prisma.event.findFirst({
    where: {
      id,
      organizerId: userId,
    },
    include: {
      ticketTypes: true,
    },
  });

  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found' });
  }

  res.json({
    success: true,
    data: event,
  });
}));

// POST /api/v1/organizer/events - Create event
router.post('/events', requireRoleMiddleware(Role.ORGANIZER), asyncHandler(async (req, res) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const body = createEventSchema.parse(req.body);
  const { ticketTypes, ...eventData } = body;

  // Generate slug
  const baseSlug = slugify(body.title);
  let slug = baseSlug;
  let counter = 1;

  // Ensure unique slug
  while (await req.prisma.event.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  // Create event
  const event = await req.prisma.event.create({
    data: {
      ...eventData,
      slug,
      organizerId: userId,
      status: 'DRAFT',
      ticketTypes: {
        create: ticketTypes,
      },
    },
    include: {
      ticketTypes: true,
    },
  });

  // Invalidate events list cache so when organizer publishes, browse events page shows it
  await req.redis.invalidateEventsListCache();

  res.json({
    success: true,
    data: event,
  });
}));

// PUT /api/v1/organizer/events/:id - Update event
router.put('/events/:id', requireRoleMiddleware(Role.ORGANIZER), asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  // Verify ownership
  const existingEvent = await req.prisma.event.findFirst({
    where: {
      id,
      organizerId: userId,
    },
  });

  if (!existingEvent) {
    return res.status(404).json({ success: false, error: 'Event not found' });
  }

  const body = updateEventSchema.parse(req.body);
  const { ticketTypes, ...eventData } = body;

  // Validate key business rules for date/sale windows using merged values.
  const mergedStart = (eventData.startDateTime ?? existingEvent.startDateTime) as Date;
  const mergedEnd = (eventData.endDateTime ?? existingEvent.endDateTime) as Date;
  const mergedSaleStart = (eventData.saleStart ?? existingEvent.saleStart) as Date;
  const mergedSaleEnd = (eventData.saleEnd ?? existingEvent.saleEnd) as Date;

  if (mergedEnd <= mergedStart) {
    return res.status(400).json({ success: false, error: 'endDateTime must be after startDateTime' });
  }
  if (mergedSaleEnd < mergedSaleStart) {
    return res.status(400).json({ success: false, error: 'saleEnd must be after saleStart' });
  }
  if (mergedSaleEnd > mergedStart) {
    return res.status(400).json({ success: false, error: 'saleEnd cannot be after the event startDateTime' });
  }

  // Regenerate slug if title changed
  let slug = existingEvent.slug;
  if (body.title && body.title !== existingEvent.title) {
    const baseSlug = slugify(body.title);
    slug = baseSlug;
    let counter = 1;
    while (await req.prisma.event.findFirst({ 
      where: { slug, id: { not: id } } 
    })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  // Update event
  const updatedEvent = await req.prisma.event.update({
    where: { id },
    data: {
      ...eventData,
      ...(slug !== existingEvent.slug ? { slug } : {}),
    },
    include: {
      ticketTypes: true,
    },
  });

  // Handle ticket types if provided
  if (ticketTypes) {
    // Get existing ticket type IDs
    const existingTicketTypeIds = updatedEvent.ticketTypes.map(tt => tt.id);
    const providedTicketTypeIds = ticketTypes
      .map(tt => tt.id)
      .filter((id): id is string => id !== undefined);

    // Delete removed ticket types
    const idsToDelete = existingTicketTypeIds.filter(
      id => !providedTicketTypeIds.includes(id)
    );
    if (idsToDelete.length > 0) {
      await req.prisma.ticketType.deleteMany({
        where: {
          id: { in: idsToDelete },
          eventId: id,
        },
      });
    }

    // Update or create ticket types
    for (const ticketType of ticketTypes) {
      if (ticketType.id) {
        // Update existing
        await req.prisma.ticketType.update({
          where: { id: ticketType.id },
          data: {
            name: ticketType.name,
            description: ticketType.description,
            price: ticketType.price,
            currency: ticketType.currency,
            totalQuantity: ticketType.totalQuantity,
            maxPerOrder: ticketType.maxPerOrder,
            minPerOrder: ticketType.minPerOrder,
          },
        });
      } else {
        // Create new
        await req.prisma.ticketType.create({
          data: {
            eventId: id,
            name: ticketType.name,
            description: ticketType.description,
            price: ticketType.price,
            currency: ticketType.currency,
            totalQuantity: ticketType.totalQuantity,
            maxPerOrder: ticketType.maxPerOrder,
            minPerOrder: ticketType.minPerOrder,
          },
        });
      }
    }
  }

  // Return updated event with ticket types
  const finalEvent = await req.prisma.event.findUnique({
    where: { id },
    include: {
      ticketTypes: true,
    },
  });

  // Invalidate event detail cache so public event page shows updated data
  if (finalEvent) {
    await req.redis.invalidateEventDetailCache(finalEvent.id, finalEvent.slug);
  }

  res.json({
    success: true,
    data: finalEvent,
  });
}));

// PATCH /api/v1/organizer/events/:id/status - Update event status
router.patch('/events/:id/status', requireRoleMiddleware(Role.ORGANIZER), asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  // Verify ownership
  const event = await req.prisma.event.findFirst({
    where: {
      id,
      organizerId: userId,
    },
  });

  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found' });
  }

  const body = statusUpdateSchema.parse(req.body);
  const { status } = body;

  // If publishing a seated event, require seats to be configured first.
  if ((status === 'PUBLISHED' || status === 'LIVE') && event.isSeated) {
    const seatCount = await req.prisma.seat.count({ where: { eventId: id } });
    if (seatCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'Seated events must have seats configured before publishing',
      });
    }
  }

  // Validate status transition (basic validation)
  const validTransitions: Record<string, string[]> = {
    DRAFT: ['PUBLISHED', 'CANCELLED'],
    PUBLISHED: ['LIVE', 'CANCELLED', 'DRAFT'],
    LIVE: ['SOLD_OUT', 'COMPLETED', 'CANCELLED'],
    SOLD_OUT: ['COMPLETED', 'CANCELLED'],
    CANCELLED: [],
    COMPLETED: [],
  };

  const allowedStatuses = validTransitions[event.status] || [];
  if (!allowedStatuses.includes(status) && event.status !== status) {
    return res.status(400).json({
      success: false,
      error: `Cannot transition from ${event.status} to ${status}`,
    });
  }

  // Update status
  const updatedEvent = await req.prisma.event.update({
    where: { id },
    data: { status },
    include: {
      ticketTypes: true,
    },
  });

  // Invalidate public events list and event detail cache so browse events page shows in real time
  if (status === 'PUBLISHED' || status === 'LIVE') {
    await req.redis.invalidateEventsListCache();
  }
  await req.redis.invalidateEventDetailCache(updatedEvent.id, updatedEvent.slug);

  res.json({
    success: true,
    data: updatedEvent,
  });
}));

// GET /api/v1/organizer/events/:id/seats - List seats for event
router.get('/events/:id/seats', requireRoleMiddleware(Role.ORGANIZER), asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  // Verify event ownership and isSeated
  const event = await req.prisma.event.findFirst({
    where: {
      id,
      organizerId: userId,
    },
  });

  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found' });
  }

  if (!event.isSeated) {
    return res.status(400).json({ success: false, error: 'Event is not a seated event' });
  }

  const seats = await req.prisma.seat.findMany({
    where: { eventId: id },
    orderBy: [
      { section: 'asc' },
      { row: 'asc' },
      { number: 'asc' },
    ],
  });

  res.json({
    success: true,
    data: seats,
  });
}));

// POST /api/v1/organizer/events/:id/seats - Create seats (bulk)
router.post('/events/:id/seats', requireRoleMiddleware(Role.ORGANIZER), asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  // Verify event ownership and isSeated
  const event = await req.prisma.event.findFirst({
    where: {
      id,
      organizerId: userId,
    },
  });

  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found' });
  }

  if (!event.isSeated) {
    return res.status(400).json({ success: false, error: 'Event is not a seated event' });
  }

  const body = z.object({
    seats: z.array(
      z.object({
        section: z.string(),
        row: z.string().optional(),
        number: z.string(),
        tier: z.string().optional(),
      })
    ),
  }).parse(req.body);

  // Create seats
  const createdSeats = await Promise.all(
    body.seats.map((seat) =>
      req.prisma.seat.create({
        data: {
          eventId: id,
          section: seat.section,
          row: seat.row,
          number: seat.number,
          tier: seat.tier,
          status: 'AVAILABLE',
        },
      })
    )
  );

  res.json({
    success: true,
    data: createdSeats,
    message: `Created ${createdSeats.length} seats`,
  });
}));

// PUT /api/v1/organizer/events/:id/seats/:seatId - Update seat (block/unblock)
router.put('/events/:id/seats/:seatId', requireRoleMiddleware(Role.ORGANIZER), asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const { id, seatId } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  // Verify event ownership
  const event = await req.prisma.event.findFirst({
    where: {
      id,
      organizerId: userId,
    },
  });

  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found' });
  }

  const body = z.object({
    status: z.enum(['AVAILABLE', 'BLOCKED']),
  }).parse(req.body);

  // Update seat
  const updatedSeat = await req.prisma.seat.update({
    where: { id: seatId },
    data: { status: body.status },
  });

  res.json({
    success: true,
    data: updatedSeat,
  });
}));

// DELETE /api/v1/organizer/events/:id/seats/:seatId - Delete seat
router.delete('/events/:id/seats/:seatId', requireRoleMiddleware(Role.ORGANIZER), asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const { id, seatId } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  // Verify event ownership
  const event = await req.prisma.event.findFirst({
    where: {
      id,
      organizerId: userId,
    },
  });

  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found' });
  }

  // Check if seat is sold
  const seat = await req.prisma.seat.findUnique({
    where: { id: seatId },
  });

  if (!seat) {
    return res.status(404).json({ success: false, error: 'Seat not found' });
  }

  if (seat.status === 'SOLD') {
    return res.status(400).json({ success: false, error: 'Cannot delete a sold seat' });
  }

  await req.prisma.seat.delete({
    where: { id: seatId },
  });

  res.json({
    success: true,
    message: 'Seat deleted',
  });
}));

// POST /api/v1/organizer/events/:id/check-in - Check in attendee
router.post('/events/:id/check-in', requireRoleMiddleware(Role.ORGANIZER), asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  // Verify event ownership
  const event = await req.prisma.event.findFirst({
    where: {
      id,
      organizerId: userId,
    },
  });

  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found' });
  }

  const body = z.object({
    ticketNumber: z.string().optional(),
    qrCodeData: z.string().optional(),
  }).parse(req.body);

  let ticket;

  // Find ticket by ticketNumber or QR code
  if (body.ticketNumber) {
    ticket = await req.prisma.ticket.findFirst({
      where: {
        ticketNumber: body.ticketNumber,
        eventId: id,
      },
      include: {
        order: true,
        ticketType: true,
      },
    });
  } else if (body.qrCodeData) {
    // Parse QR code JSON
    try {
      const qrData = JSON.parse(body.qrCodeData);
      ticket = await req.prisma.ticket.findFirst({
        where: {
          ticketNumber: qrData.ticketNumber,
          eventId: id,
        },
        include: {
          order: true,
          ticketType: true,
        },
      });
    } catch (error) {
      return res.status(400).json({ success: false, error: 'Invalid QR code data' });
    }
  } else {
    return res.status(400).json({ success: false, error: 'Ticket number or QR code data is required' });
  }

  if (!ticket) {
    return res.status(404).json({ success: false, error: 'Ticket not found' });
  }

  // Verify ticket belongs to event
  if (ticket.eventId !== id) {
    return res.status(400).json({ success: false, error: 'Ticket does not belong to this event' });
  }

  // Check if already checked in
  if (ticket.status === 'USED' && ticket.checkedInAt) {
    return res.json({
      success: false,
      error: 'Ticket already checked in',
      data: {
        ticket: {
          ticketNumber: ticket.ticketNumber,
          checkedInAt: ticket.checkedInAt,
        },
      },
    });
  }

  // Update ticket
  const updatedTicket = await req.prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status: 'USED',
      checkedInAt: new Date(),
      checkedInBy: userId,
    },
    include: {
      order: {
        select: {
          customerName: true,
          customerEmail: true,
        },
      },
      ticketType: {
        select: {
          name: true,
        },
      },
    },
  });

  res.json({
    success: true,
    data: {
      ticket: updatedTicket,
      message: 'Ticket checked in successfully',
    },
  });
}));

// GET /api/v1/organizer/orders/summary-by-ticket-type - Orders grouped by ticket type for all organizer events
router.get('/orders/summary-by-ticket-type', requireRoleMiddleware(Role.ORGANIZER), asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const tickets = await req.prisma.ticket.findMany({
    where: {
      order: { status: 'PAID' },
      event: { organizerId: userId },
    },
    select: {
      eventId: true,
      orderId: true,
      ticketTypeId: true,
      event: { select: { title: true } },
      ticketType: { select: { name: true, price: true } },
    },
  });

  const byKey: Record<string, { eventId: string; eventTitle: string; ticketTypeId: string; ticketTypeName: string; orderIds: Set<string>; revenue: number }> = {};
  for (const t of tickets) {
    const key = `${t.eventId}-${t.ticketTypeId}`;
    if (!byKey[key]) {
      byKey[key] = {
        eventId: t.eventId,
        eventTitle: t.event.title,
        ticketTypeId: t.ticketTypeId,
        ticketTypeName: t.ticketType.name,
        orderIds: new Set(),
        revenue: 0,
      };
    }
    byKey[key].orderIds.add(t.orderId);
    byKey[key].revenue += Number(t.ticketType.price);
  }

  const data = Object.values(byKey).map((g) => ({
    eventId: g.eventId,
    eventTitle: g.eventTitle,
    ticketTypeId: g.ticketTypeId,
    ticketTypeName: g.ticketTypeName,
    orderCount: g.orderIds.size,
    revenue: g.revenue,
  }));

  res.json({ success: true, data });
}));

// GET /api/v1/organizer/events/:id/orders - Get event orders
router.get('/events/:id/orders', requireRoleMiddleware(Role.ORGANIZER), asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const { id } = req.params;
  const query = req.query as { status?: string; page?: string; limit?: string; ticketTypeId?: string };

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  // Verify event ownership
  const event = await req.prisma.event.findFirst({
    where: {
      id,
      organizerId: userId,
    },
  });

  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found' });
  }

  const page = query.page ? parseInt(query.page, 10) : 1;
  const limit = query.limit ? parseInt(query.limit, 10) : 20;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = { eventId: id };
  if (query.status) {
    where.status = query.status;
  }
  if (query.ticketTypeId) {
    where.tickets = { some: { ticketTypeId: query.ticketTypeId } };
  }

  // Get orders
  const [orders, total] = await Promise.all([
    req.prisma.order.findMany({
      where,
      include: {
        tickets: {
          select: {
            id: true,
            ticketNumber: true,
            status: true,
            ticketTypeId: true,
            ticketType: { select: { name: true, price: true } },
          },
        },
        _count: {
          select: {
            tickets: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    }),
    req.prisma.order.count({ where }),
  ]);

  res.json({
    success: true,
    data: orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}));

// GET /api/v1/organizer/events/:id/waitlist - Get event waitlist
router.get('/events/:id/waitlist', requireRoleMiddleware(Role.ORGANIZER), asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  // Verify event ownership
  const event = await req.prisma.event.findFirst({
    where: {
      id,
      organizerId: userId,
    },
  });

  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found' });
  }

  // Get waitlist entries
  const waitlist = await req.prisma.waitlist.findMany({
    where: { eventId: id },
    include: {
      ticketType: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  res.json({
    success: true,
    data: waitlist,
  });
}));

// GET /api/v1/organizer/events/:id/analytics - Get event analytics
router.get('/events/:id/analytics', requireRoleMiddleware(Role.ORGANIZER), asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  // Run queries sequentially to avoid connection pool exhaustion (pool limit may be 1)
  const event = await req.prisma.event.findFirst({
    where: {
      id,
      organizerId: userId,
    },
    select: { id: true, title: true, status: true, isSeated: true },
  });

  const revenueData = await req.prisma.order.aggregate({
    where: { eventId: id, status: 'PAID' },
    _sum: { totalAmount: true },
  });

  const ticketCount = await req.prisma.ticket.count({
    where: { order: { eventId: id, status: 'PAID' } },
  });

  const orderCount = await req.prisma.order.count({
    where: { eventId: id, status: 'PAID' },
  });

  const ticketTypes = await req.prisma.ticketType.findMany({
    where: { eventId: id },
    select: { totalQuantity: true, soldQuantity: true },
  });

  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found' });
  }

  const totalRevenue = Number(revenueData._sum.totalAmount || 0);
  const available = ticketTypes.reduce(
    (sum, tt) => sum + (Number(tt.totalQuantity) - Number(tt.soldQuantity)),
    0
  );

  res.json({
    success: true,
    data: {
      event: {
        id: event.id,
        title: event.title,
        status: event.status,
        isSeated: event.isSeated,
      },
      revenue: {
        total: totalRevenue,
        currency: 'NGN',
      },
      tickets: {
        sold: ticketCount,
        available,
      },
      orders: {
        total: orderCount,
        paid: orderCount,
      },
    },
  });
}));

export default router;
