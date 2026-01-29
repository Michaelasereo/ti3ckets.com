import { Router } from 'express';
import { requireRoleMiddleware } from '../../middleware/auth';
import { Role } from '@prisma/client';
import { asyncHandler } from '../../middleware/asyncHandler';
import { PayoutService } from '../../services/payout';

const router = Router();
const payoutService = new PayoutService();

// GET /api/v1/organizer/revenue - Get overall revenue summary
router.get('/', requireRoleMiddleware(Role.ORGANIZER), asyncHandler(async (req, res) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  // Get balances (includes fee breakdown)
  const balances = await payoutService.calculateBalances(req.prisma, userId);

  // Get all events with their revenue
  const events = await req.prisma.event.findMany({
    where: { organizerId: userId },
    include: {
      orders: {
        where: { status: 'PAID' },
        select: {
          totalAmount: true,
          createdAt: true,
        },
      },
      ticketTypes: {
        select: {
          id: true,
          name: true,
          price: true,
          soldQuantity: true,
        },
      },
    },
  });

  // Calculate per-event revenue
  const eventRevenue = events.map((event) => {
    const eventTotal = event.orders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0
    );
    const ticketsSold = event.ticketTypes.reduce(
      (sum, tt) => sum + tt.soldQuantity,
      0
    );

    return {
      eventId: event.id,
      eventTitle: event.title,
      revenue: eventTotal,
      ticketsSold,
      ticketTypes: event.ticketTypes.map((tt) => ({
        id: tt.id,
        name: tt.name,
        price: Number(tt.price),
        sold: tt.soldQuantity,
        revenue: Number(tt.price) * tt.soldQuantity,
      })),
    };
  });

  res.json({
    success: true,
    data: {
      summary: balances,
      events: eventRevenue,
    },
  });
}));

export default router;
