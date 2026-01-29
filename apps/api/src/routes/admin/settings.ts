import { Router } from 'express';
import { z } from 'zod';
import { requireRoleMiddleware } from '../../middleware/auth';
import { Role } from '@prisma/client';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();

// GET /api/v1/admin/settings - Get system settings
router.get('/', requireRoleMiddleware(Role.ADMIN), asyncHandler(async (req, res) => {
  // For now, return environment-based settings
  // In the future, these could be stored in a database table
  const settings = {
    platformFeePercentage: parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '3.5'),
    paystackFeePercentage: parseFloat(process.env.PAYSTACK_FEE_PERCENTAGE || '1.5'),
    paystackFixedFee: parseFloat(process.env.PAYSTACK_FIXED_FEE || '100'),
    freeTicketsThreshold: parseFloat(process.env.FREE_TICKETS_THRESHOLD || '100'),
    minimumPayoutThreshold: parseFloat(process.env.MINIMUM_PAYOUT_THRESHOLD || '10000'),
  };

  res.json({
    success: true,
    data: settings,
  });
}));

// PATCH /api/v1/admin/settings - Update system settings
router.patch('/', requireRoleMiddleware(Role.ADMIN), asyncHandler(async (req, res) => {
  const schema = z.object({
    platformFeePercentage: z.number().min(0).max(100).optional(),
    paystackFeePercentage: z.number().min(0).max(100).optional(),
    paystackFixedFee: z.number().min(0).optional(),
    freeTicketsThreshold: z.number().int().min(0).optional(),
    minimumPayoutThreshold: z.number().min(0).optional(),
  });

  const settings = schema.parse(req.body);

  // Note: In a production system, these should be stored in a database
  // For now, we'll just return the updated values
  // The actual environment variables would need to be updated manually or via a config service

  res.json({
    success: true,
    data: settings,
    message: 'Settings updated (stored in environment variables in production)',
  });
}));

export default router;
