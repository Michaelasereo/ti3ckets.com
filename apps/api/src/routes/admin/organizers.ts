import { Router } from 'express';
import { z } from 'zod';
import { requireRoleMiddleware } from '../../middleware/auth';
import { Role, OrganizerVerificationStatus } from '@prisma/client';
import { asyncHandler } from '../../middleware/asyncHandler';
import { AdminService } from '../../services/admin';

const router = Router();
const adminService = new AdminService();

// GET /api/v1/admin/organizers - List organizers with verification status
router.get('/', requireRoleMiddleware(Role.ADMIN), asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  const verificationStatus = req.query.verificationStatus as OrganizerVerificationStatus | undefined;

  const where: any = {
    organizerProfile: {
      isNot: null,
    },
  };

  if (verificationStatus) {
    where.organizerProfile = {
      verificationStatus,
    };
  }

  const [users, total] = await Promise.all([
    req.prisma.user.findMany({
      where,
      skip,
      take: limit,
      include: {
        organizerProfile: true,
        _count: {
          select: {
            events: true,
            orders: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    req.prisma.user.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      organizers: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
}));

// GET /api/v1/admin/organizers/:id - Get organizer details
router.get('/:id', requireRoleMiddleware(Role.ADMIN), asyncHandler(async (req, res) => {
  const organizerId = req.params.id;

  const user = await req.prisma.user.findUnique({
    where: { id: organizerId },
    include: {
      organizerProfile: true,
      events: {
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              orders: true,
              tickets: true,
            },
          },
        },
      },
      _count: {
        select: {
          orders: true,
        },
      },
    },
  });

  if (!user || !user.organizerProfile) {
    return res.status(404).json({
      success: false,
      error: 'Organizer not found',
    });
  }

  res.json({
    success: true,
    data: user,
  });
}));

// PATCH /api/v1/admin/organizers/:id/verification - Update verification status (simplified to VERIFIED/SUSPENDED only)
router.patch('/:id/verification', requireRoleMiddleware(Role.ADMIN), asyncHandler(async (req, res) => {
  const organizerId = req.params.id;
  const schema = z.object({
    verificationStatus: z.enum(['VERIFIED', 'SUSPENDED']),
  });

  const { verificationStatus } = schema.parse(req.body);

  const organizerProfile = await adminService.updateOrganizerVerification(
    req.prisma,
    organizerId,
    verificationStatus as 'VERIFIED' | 'SUSPENDED'
  );

  res.json({
    success: true,
    data: organizerProfile,
  });
}));

export default router;
