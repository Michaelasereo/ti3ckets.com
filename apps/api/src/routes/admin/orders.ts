import { Router } from 'express';
import { requireRoleMiddleware } from '../../middleware/auth';
import { Role, OrderStatus } from '@prisma/client';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();

// GET /api/v1/admin/orders - List all orders
router.get('/', requireRoleMiddleware(Role.ADMIN), asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  const status = req.query.status as OrderStatus | undefined;
  const eventId = req.query.eventId as string | undefined;
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (eventId) {
    where.eventId = eventId;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = startDate;
    }
    if (endDate) {
      where.createdAt.lte = endDate;
    }
  }

  const [orders, total] = await Promise.all([
    req.prisma.order.findMany({
      where,
      skip,
      take: limit,
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            organizer: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        tickets: {
          take: 5,
        },
        _count: {
          select: {
            tickets: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    req.prisma.order.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
}));

// GET /api/v1/admin/orders/:id - Get order details
router.get('/:id', requireRoleMiddleware(Role.ADMIN), asyncHandler(async (req, res) => {
  const orderId = req.params.id;

  const order = await req.prisma.order.findUnique({
    where: { id: orderId },
    include: {
      event: {
        include: {
          organizer: {
            include: {
              organizerProfile: {
                select: {
                  businessName: true,
                },
              },
            },
          },
        },
      },
      tickets: {
        include: {
          ticketType: {
            select: {
              name: true,
              price: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    return res.status(404).json({
      success: false,
      error: 'Order not found',
    });
  }

  res.json({
    success: true,
    data: order,
  });
}));

export default router;
