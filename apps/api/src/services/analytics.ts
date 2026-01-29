import { PrismaClient, OrderStatus, EventStatus } from '@prisma/client';

export class AnalyticsService {
  /**
   * Calculate platform-wide analytics
   */
  async getPlatformAnalytics(prisma: PrismaClient, filters?: {
    startDate?: Date;
    endDate?: Date;
  }) {
    const whereClause: any = {};
    if (filters?.startDate || filters?.endDate) {
      whereClause.createdAt = {};
      if (filters.startDate) {
        whereClause.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        whereClause.createdAt.lte = filters.endDate;
      }
    }

    // Get all paid orders
    const paidOrders = await prisma.order.findMany({
      where: {
        ...whereClause,
        status: OrderStatus.PAID,
      },
      include: {
        event: {
          include: {
            organizer: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        tickets: true,
      },
    });

    // Calculate metrics
    const totalRevenue = paidOrders.reduce((sum, order) => {
      return sum + Number(order.totalAmount);
    }, 0);

    const totalTicketsSold = paidOrders.reduce((sum, order) => {
      return sum + order.tickets.length;
    }, 0);

    // Revenue by month
    const revenueByMonth: Record<string, number> = {};
    paidOrders.forEach((order) => {
      const monthKey = new Date(order.createdAt).toISOString().slice(0, 7); // YYYY-MM
      revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + Number(order.totalAmount);
    });

    // Top events by revenue
    const eventRevenue: Record<string, { event: any; revenue: number; tickets: number }> = {};
    paidOrders.forEach((order) => {
      const eventId = order.eventId;
      if (!eventRevenue[eventId]) {
        eventRevenue[eventId] = {
          event: order.event,
          revenue: 0,
          tickets: 0,
        };
      }
      eventRevenue[eventId].revenue += Number(order.totalAmount);
      eventRevenue[eventId].tickets += order.tickets.length;
    });

    const topEvents = Object.values(eventRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((item) => ({
        eventId: item.event.id,
        eventTitle: item.event.title,
        eventSlug: item.event.slug,
        revenue: item.revenue,
        ticketsSold: item.tickets,
      }));

    // Top organizers by revenue
    const organizerRevenue: Record<string, { organizer: any; revenue: number; events: number }> = {};
    paidOrders.forEach((order) => {
      const organizerId = order.event.organizer.id;
      if (!organizerRevenue[organizerId]) {
        organizerRevenue[organizerId] = {
          organizer: order.event.organizer,
          revenue: 0,
          events: new Set<string>(),
        };
      }
      organizerRevenue[organizerId].revenue += Number(order.totalAmount);
      (organizerRevenue[organizerId].events as any).add(order.eventId);
    });

    const topOrganizers = Object.values(organizerRevenue)
      .map((item) => ({
        ...item,
        events: Array.from(item.events as Set<string>).length,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((item) => ({
        organizerId: item.organizer.id,
        organizerEmail: item.organizer.email,
        organizerName: item.organizer.name,
        revenue: item.revenue,
        eventCount: item.events,
      }));

    // Fee calculation (using PayoutService logic)
    // Platform fee: 3.5%, Paystack: 1.5% + 100 NGN
    const platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '3.5') / 100;
    const paystackFeePercent = parseFloat(process.env.PAYSTACK_FEE_PERCENTAGE || '1.5') / 100;
    const paystackFixedFee = parseFloat(process.env.PAYSTACK_FIXED_FEE || '100');

    const totalPlatformFees = paidOrders.reduce((sum, order) => {
      const orderAmount = Number(order.totalAmount);
      const platformFee = orderAmount * platformFeePercent;
      return sum + platformFee;
    }, 0);

    const totalPaystackFees = paidOrders.reduce((sum, order) => {
      const orderAmount = Number(order.totalAmount);
      const paystackFee = orderAmount * paystackFeePercent + paystackFixedFee;
      return sum + paystackFee;
    }, 0);

    return {
      totalRevenue,
      totalTicketsSold,
      totalPlatformFees,
      totalPaystackFees,
      totalFees: totalPlatformFees + totalPaystackFees,
      revenueByMonth,
      topEvents,
      topOrganizers,
      averageOrderValue: paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0,
      totalOrders: paidOrders.length,
    };
  }
}
