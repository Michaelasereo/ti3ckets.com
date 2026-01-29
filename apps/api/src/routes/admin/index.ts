import { Router } from 'express';
import { requireRoleMiddleware } from '../../middleware/auth';
import { Role } from '@prisma/client';
import { asyncHandler } from '../../middleware/asyncHandler';
import { AdminService } from '../../services/admin';
import { AnalyticsService } from '../../services/analytics';

const router = Router();
const adminService = new AdminService();
const analyticsService = new AnalyticsService();

// GET /api/v1/admin/dashboard - Platform overview statistics
router.get('/dashboard', requireRoleMiddleware(Role.ADMIN), asyncHandler(async (req, res) => {
  const stats = await adminService.getPlatformStats(req.prisma);
  
  res.json({
    success: true,
    data: stats,
  });
}));

// GET /api/v1/admin/analytics - Detailed platform analytics
router.get('/analytics', requireRoleMiddleware(Role.ADMIN), asyncHandler(async (req, res) => {
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  const analytics = await analyticsService.getPlatformAnalytics(req.prisma, {
    startDate,
    endDate,
  });

  res.json({
    success: true,
    data: analytics,
  });
}));

export default router;
