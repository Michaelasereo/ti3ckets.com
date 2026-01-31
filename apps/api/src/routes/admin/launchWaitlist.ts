import { Router, Request, Response } from 'express';
import { requireRoleMiddleware } from '../../middleware/auth';
import { Role } from '@prisma/client';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();

function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// GET /api/v1/admin/launch-waitlist - List all launch waitlist entries (admin only)
router.get(
  '/',
  requireRoleMiddleware(Role.ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      req.prisma.launchWaitlistEntry.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      req.prisma.launchWaitlistEntry.count(),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        entries,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      },
    });
  })
);

// GET /api/v1/admin/launch-waitlist/export - Export full list as CSV (admin only)
router.get(
  '/export',
  requireRoleMiddleware(Role.ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const entries = await req.prisma.launchWaitlistEntry.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const header = 'First Name,Email,Signed up at';
    const rows = entries.map((e) => {
      const signedUpAt = new Date(e.createdAt).toISOString();
      return [escapeCsvValue(e.firstName), escapeCsvValue(e.email), escapeCsvValue(signedUpAt)].join(',');
    });
    const csv = [header, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="launch-waitlist.csv"');
    res.send(csv);
  })
);

export default router;
