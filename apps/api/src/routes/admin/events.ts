import { Router } from 'express';
import { z } from 'zod';
import { requireRoleMiddleware } from '../../middleware/auth';
import { Role, EventStatus } from '@prisma/client';
import { asyncHandler } from '../../middleware/asyncHandler';
import { AdminService } from '../../services/admin';

const router = Router();
const adminService = new AdminService();

// GET /api/v1/admin/events - List all events
router.get('/', requireRoleMiddleware(Role.ADMIN), asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  const status = req.query.status as EventStatus | undefined;
  const organizerId = req.query.organizerId as string | undefined;
  const search = req.query.search as string | undefined;

  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (organizerId) {
    where.organizerId = organizerId;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [events, total] = await Promise.all([
    req.prisma.event.findMany({
      where,
      skip,
      take: limit,
      include: {
        organizer: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        _count: {
          select: {
            orders: true,
            tickets: true,
            ticketTypes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    req.prisma.event.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
}));

// GET /api/v1/admin/events/:id - Get event details
router.get('/:id', requireRoleMiddleware(Role.ADMIN), asyncHandler(async (req, res) => {
  const eventId = req.params.id;

  const event = await req.prisma.event.findUnique({
    where: { id: eventId },
    include: {
      organizer: {
        include: {
          organizerProfile: {
            select: {
              businessName: true,
              verificationStatus: true,
            },
          },
        },
      },
      ticketTypes: true,
      orders: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          tickets: true,
        },
      },
      _count: {
        select: {
          orders: true,
          tickets: true,
        },
      },
    },
  });

  if (!event) {
    return res.status(404).json({
      success: false,
      error: 'Event not found',
    });
  }

  res.json({
    success: true,
    data: event,
  });
}));

// PATCH /api/v1/admin/events/:id/status - Suspend/approve event
router.patch('/:id/status', requireRoleMiddleware(Role.ADMIN), asyncHandler(async (req, res) => {
  const eventId = req.params.id;
  const schema = z.object({
    status: z.nativeEnum(EventStatus),
  });

  const { status } = schema.parse(req.body);

  const event = await adminService.updateEventStatus(req.prisma, eventId, status);

  res.json({
    success: true,
    data: event,
  });
}));

export default router;
