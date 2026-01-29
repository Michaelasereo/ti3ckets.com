import { Router } from 'express';
import { z } from 'zod';
import { requireRoleMiddleware } from '../../middleware/auth';
import { Role } from '@prisma/client';
import { asyncHandler } from '../../middleware/asyncHandler';
import { AdminService } from '../../services/admin';

const router = Router();
const adminService = new AdminService();

// GET /api/v1/admin/users - List all users with filters
router.get('/', requireRoleMiddleware(Role.ADMIN), asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  const role = req.query.role as Role | undefined;
  const search = req.query.search as string | undefined;

  const where: any = {};
  
  if (role) {
    where.roles = {
      some: {
        role,
      },
    };
  }

  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    req.prisma.user.findMany({
      where,
      skip,
      take: limit,
      include: {
        roles: {
          select: {
            role: true,
            grantedBy: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        buyerProfile: {
          select: {
            id: true,
            createdAt: true,
          },
        },
        organizerProfile: {
          select: {
            id: true,
            verificationStatus: true,
            businessName: true,
          },
        },
        _count: {
          select: {
            orders: true,
            events: true,
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
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
}));

// GET /api/v1/admin/users/:id - Get user details
router.get('/:id', requireRoleMiddleware(Role.ADMIN), asyncHandler(async (req, res) => {
  const userId = req.params.id;
  
  const user = await adminService.getUserDetails(req.prisma, userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

  res.json({
    success: true,
    data: user,
  });
}));

// PATCH /api/v1/admin/users/:id/status - Suspend/unsuspend user
router.patch('/:id/status', requireRoleMiddleware(Role.ADMIN), asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const schema = z.object({
    suspended: z.boolean(),
  });

  const { suspended } = schema.parse(req.body);
  const accountLockedUntil = suspended ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null; // 1 year if suspended

  const user = await adminService.updateUserStatus(req.prisma, userId, accountLockedUntil);

  res.json({
    success: true,
    data: user,
  });
}));

// POST /api/v1/admin/users/:id/roles - Grant role
router.post('/:id/roles', requireRoleMiddleware(Role.ADMIN), asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const adminUserId = req.user?.userId;

  if (!adminUserId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const schema = z.object({
    role: z.nativeEnum(Role),
  });

  const { role } = schema.parse(req.body);

  const userRole = await adminService.grantRole(req.prisma, userId, role, adminUserId);

  res.json({
    success: true,
    data: userRole,
  });
}));

// DELETE /api/v1/admin/users/:id/roles/:role - Revoke role
router.delete('/:id/roles/:role', requireRoleMiddleware(Role.ADMIN), asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const role = req.params.role as Role;

  if (!Object.values(Role).includes(role)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid role',
    });
  }

  await adminService.revokeRole(req.prisma, userId, role);

  res.json({
    success: true,
    message: 'Role revoked successfully',
  });
}));

export default router;
