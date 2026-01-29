import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();

const createPromoCodeSchema = z.object({
  code: z.string().transform((val) => val.toUpperCase()),
  description: z.string().optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.number().positive(),
  maxUses: z.number().int().positive().optional(),
  maxUsesPerUser: z.number().int().positive().default(1),
  validFrom: z.string().transform((val) => new Date(val)),
  validUntil: z.string().transform((val) => new Date(val)),
  eventId: z.string().optional(),
  minOrderAmount: z.number().positive().optional(),
  isActive: z.boolean().default(true),
});

const updatePromoCodeSchema = createPromoCodeSchema.partial();

// GET /api/v1/organizer/promo-codes - List organizer's promo codes
router.get('/', asyncHandler(authenticate), asyncHandler(async (req, res) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  // Get organizer's events
  const organizerEvents = await req.prisma.event.findMany({
    where: { organizerId: userId },
    select: { id: true },
  });

  const eventIds = organizerEvents.map((e) => e.id);

  // Get global promo codes (eventId is null) and event-specific codes for organizer's events
  const promoCodes = await req.prisma.promoCode.findMany({
    where: {
      OR: [
        { eventId: null }, // Global codes
        { eventId: { in: eventIds } }, // Event-specific codes
      ],
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  res.json({
    success: true,
    data: promoCodes,
  });
}));

// POST /api/v1/organizer/promo-codes - Create promo code
router.post('/', asyncHandler(authenticate), asyncHandler(async (req, res) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const body = createPromoCodeSchema.parse(req.body);

  // If eventId is provided, verify ownership
  if (body.eventId) {
    const event = await req.prisma.event.findFirst({
      where: {
        id: body.eventId,
        organizerId: userId,
      },
    });

    if (!event) {
      return res.status(403).json({ success: false, error: 'You do not own this event' });
    }
  }

  // Check if code already exists
  const existing = await req.prisma.promoCode.findUnique({
    where: { code: body.code },
  });

  if (existing) {
    return res.status(400).json({ success: false, error: 'Promo code already exists' });
  }

  // Create promo code
  const promoCode = await req.prisma.promoCode.create({
    data: {
      ...body,
      currentUses: 0,
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
    },
  });

  res.json({
    success: true,
    data: promoCode,
  });
}));

// GET /api/v1/organizer/promo-codes/:id - Get promo code details
router.get('/:id', asyncHandler(authenticate), asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const promoCode = await req.prisma.promoCode.findUnique({
    where: { id },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
    },
  });

  if (!promoCode) {
    return res.status(404).json({ success: false, error: 'Promo code not found' });
  }

  // Verify ownership (if event-specific, check event ownership)
  if (promoCode.eventId) {
    const event = await req.prisma.event.findFirst({
      where: {
        id: promoCode.eventId,
        organizerId: userId,
      },
    });

    if (!event) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
  }

  res.json({
    success: true,
    data: promoCode,
  });
}));

// PUT /api/v1/organizer/promo-codes/:id - Update promo code
router.put('/:id', asyncHandler(authenticate), asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const promoCode = await req.prisma.promoCode.findUnique({
    where: { id },
  });

  if (!promoCode) {
    return res.status(404).json({ success: false, error: 'Promo code not found' });
  }

  // Verify ownership
  if (promoCode.eventId) {
    const event = await req.prisma.event.findFirst({
      where: {
        id: promoCode.eventId,
        organizerId: userId,
      },
    });

    if (!event) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
  }

  const body = updatePromoCodeSchema.parse(req.body);

  // If eventId is being updated, verify ownership
  if (body.eventId) {
    const event = await req.prisma.event.findFirst({
      where: {
        id: body.eventId,
        organizerId: userId,
      },
    });

    if (!event) {
      return res.status(403).json({ success: false, error: 'You do not own this event' });
    }
  }

  // Check code uniqueness if code is being updated
  if (body.code && body.code !== promoCode.code) {
    const existing = await req.prisma.promoCode.findUnique({
      where: { code: body.code },
    });

    if (existing) {
      return res.status(400).json({ success: false, error: 'Promo code already exists' });
    }
  }

  // Update promo code
  const updated = await req.prisma.promoCode.update({
    where: { id },
    data: body,
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
    },
  });

  res.json({
    success: true,
    data: updated,
  });
}));

// DELETE /api/v1/organizer/promo-codes/:id - Delete promo code
router.delete('/:id', asyncHandler(authenticate), asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const promoCode = await req.prisma.promoCode.findUnique({
    where: { id },
  });

  if (!promoCode) {
    return res.status(404).json({ success: false, error: 'Promo code not found' });
  }

  // Verify ownership
  if (promoCode.eventId) {
    const event = await req.prisma.event.findFirst({
      where: {
        id: promoCode.eventId,
        organizerId: userId,
      },
    });

    if (!event) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
  }

  await req.prisma.promoCode.delete({
    where: { id },
  });

  res.json({
    success: true,
    message: 'Promo code deleted',
  });
}));

export default router;
