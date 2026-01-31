import type { PrismaClient } from '@prisma/client';
import { Role, OrderStatus, EventStatus } from '@prisma/client';

export async function getPlatformStats(prisma: PrismaClient) {
  const [
    totalUsers,
    totalBuyers,
    totalOrganizers,
    totalAdmins,
    totalEvents,
    publishedEvents,
    totalOrders,
    paidOrders,
    totalTicketsSold,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.userRole.count({ where: { role: Role.BUYER } }),
    prisma.userRole.count({ where: { role: Role.ORGANIZER } }),
    prisma.userRole.count({ where: { role: Role.ADMIN } }),
    prisma.event.count(),
    prisma.event.count({ where: { status: { in: [EventStatus.PUBLISHED, EventStatus.LIVE] } } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: OrderStatus.PAID } }),
    prisma.ticket.count({ where: { order: { status: OrderStatus.PAID } } }),
  ]);

  const revenueResult = await prisma.order.aggregate({
    where: { status: OrderStatus.PAID },
    _sum: { totalAmount: true },
  });

  const totalRevenue = Number(revenueResult._sum.totalAmount ?? 0);

  return {
    totalUsers,
    totalBuyers,
    totalOrganizers,
    totalAdmins,
    totalEvents,
    publishedEvents,
    totalOrders,
    paidOrders,
    totalTicketsSold,
    totalRevenue,
  };
}

export async function getPlatformAnalytics(
  prisma: PrismaClient,
  filters?: { startDate?: Date; endDate?: Date }
) {
  const whereClause: { createdAt?: { gte?: Date; lte?: Date } } = {};
  if (filters?.startDate || filters?.endDate) {
    whereClause.createdAt = {};
    if (filters.startDate) whereClause.createdAt.gte = filters.startDate;
    if (filters.endDate) whereClause.createdAt.lte = filters.endDate;
  }

  const paidOrders = await prisma.order.findMany({
    where: { ...whereClause, status: OrderStatus.PAID },
    include: {
      event: {
        include: {
          organizer: { select: { id: true, email: true, name: true } },
        },
      },
      tickets: true,
    },
  });

  const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const totalTicketsSold = paidOrders.reduce((sum, o) => sum + o.tickets.length, 0);

  const revenueByMonth: Record<string, number> = {};
  paidOrders.forEach((order) => {
    const monthKey = new Date(order.createdAt).toISOString().slice(0, 7);
    revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + Number(order.totalAmount);
  });

  const eventRevenue: Record<
    string,
    { event: { id: string; title: string }; revenue: number; tickets: number }
  > = {};
  paidOrders.forEach((order) => {
    const eventId = order.eventId;
    if (!eventRevenue[eventId]) {
      eventRevenue[eventId] = {
        event: { id: order.event.id, title: order.event.title },
        revenue: 0,
        tickets: 0,
      };
    }
    eventRevenue[eventId].revenue += Number(order.totalAmount);
    eventRevenue[eventId].tickets += order.tickets.length;
  });

  const topEvents = Object.values(eventRevenue)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return {
    totalRevenue,
    totalTicketsSold,
    orderCount: paidOrders.length,
    revenueByMonth,
    topEvents,
  };
}
