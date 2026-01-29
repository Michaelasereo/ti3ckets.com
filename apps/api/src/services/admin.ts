import { PrismaClient, Role, OrderStatus, EventStatus } from '@prisma/client';

export class AdminService {
  /**
   * Get platform overview statistics
   */
  async getPlatformStats(prisma: PrismaClient) {
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

    // Calculate total revenue from paid orders using SQL aggregation
    const revenueResult = await prisma.order.aggregate({
      where: { status: OrderStatus.PAID },
      _sum: { totalAmount: true },
    });

    const totalRevenue = Number(revenueResult._sum.totalAmount || 0);

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

  /**
   * Get user details with related data
   */
  async getUserDetails(prisma: PrismaClient, userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            grantedBy: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        buyerProfile: true,
        organizerProfile: true,
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            event: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        },
        events: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    return user;
  }

  /**
   * Update user account status (suspend/unsuspend)
   */
  async updateUserStatus(
    prisma: PrismaClient,
    userId: string,
    accountLockedUntil: Date | null
  ) {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        accountLockedUntil,
        failedLoginAttempts: accountLockedUntil ? 999 : 0, // Reset on unsuspend
      },
    });
  }

  /**
   * Grant role to user
   */
  async grantRole(
    prisma: PrismaClient,
    userId: string,
    role: Role,
    grantedBy: string
  ) {
    // Check if role already exists
    const existingRole = await prisma.userRole.findFirst({
      where: { userId, role },
    });

    if (existingRole) {
      return existingRole;
    }

    return await prisma.userRole.create({
      data: {
        userId,
        role,
        grantedBy,
      },
    });
  }

  /**
   * Revoke role from user
   */
  async revokeRole(prisma: PrismaClient, userId: string, role: Role) {
    return await prisma.userRole.deleteMany({
      where: { userId, role },
    });
  }

  /**
   * Update organizer verification status (simplified to only allow VERIFIED/SUSPENDED)
   */
  async updateOrganizerVerification(
    prisma: PrismaClient,
    organizerId: string,
    verificationStatus: 'VERIFIED' | 'SUSPENDED'
  ) {
    const organizerProfile = await prisma.organizerProfile.findUnique({
      where: { userId: organizerId },
    });

    if (!organizerProfile) {
      throw new Error('Organizer profile not found');
    }

    return await prisma.organizerProfile.update({
      where: { userId: organizerId },
      data: { verificationStatus },
    });
  }

  /**
   * Update event status (admin moderation)
   */
  async updateEventStatus(
    prisma: PrismaClient,
    eventId: string,
    status: EventStatus
  ) {
    return await prisma.event.update({
      where: { id: eventId },
      data: { status },
    });
  }
}
