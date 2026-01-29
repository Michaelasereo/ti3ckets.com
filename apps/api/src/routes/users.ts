import { Router } from 'express';
import { z } from 'zod';
import { authenticate, validateSession } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// GET /api/v1/users/me - Get current user info
router.get('/me', asyncHandler(validateSession), asyncHandler(async (req, res) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const userData = await req.prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        select: {
          role: true,
          grantedAt: true,
        },
      },
      buyerProfile: true,
      organizerProfile: true,
    },
  });

  if (!userData) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  res.json({
    success: true,
    data: {
      ...userData,
      roles: userData.roles.map((r) => r.role),
    },
  });
}));

// GET /api/v1/users/tickets - Get user's tickets
router.get('/tickets', asyncHandler(authenticate), asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const userEmail = req.user?.email;

  if (!userId || !userEmail) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  // Get tickets where user owns the order OR customerEmail matches
  const tickets = await req.prisma.ticket.findMany({
    where: {
      OR: [
        {
          order: {
            userId: userId,
          },
        },
        {
          order: {
            customerEmail: userEmail,
          },
        },
      ],
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          startDateTime: true,
          endDateTime: true,
          venueName: true,
          venueAddress: true,
          city: true,
          imageUrl: true,
          bannerUrl: true,
        },
      },
      ticketType: {
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          currency: true,
        },
      },
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          currency: true,
          createdAt: true,
        },
      },
      seat: {
        select: {
          id: true,
          section: true,
          row: true,
          number: true,
          tier: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  res.json({
    success: true,
    data: tickets,
  });
}));

// GET /api/v1/users/orders - Get user's orders
router.get('/orders', asyncHandler(authenticate), asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const userEmail = req.user?.email;

  if (!userId || !userEmail) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  // Get orders where user owns the order OR customerEmail matches
  const orders = await req.prisma.order.findMany({
    where: {
      OR: [
        {
          userId: userId,
        },
        {
          customerEmail: userEmail,
        },
      ],
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          startDateTime: true,
          venueName: true,
          city: true,
          imageUrl: true,
        },
      },
      tickets: {
        select: {
          id: true,
          ticketNumber: true,
          status: true,
        },
      },
      _count: {
        select: {
          tickets: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  res.json({
    success: true,
    data: orders,
  });
}));

// PUT /api/v1/users/me/profile - Update user profile (buyer or organizer)
const profileUpdateSchema = z.object({
  buyerProfile: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    dateOfBirth: z.string().nullable().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    preferredPaymentMethod: z.string().nullable().optional(),
  }).optional(),
  organizerProfile: z.object({
    // Empty strings should be rejected when provided.
    businessName: z.string().min(1).optional(),
    businessType: z.string().min(1).optional(),
    businessAddress: z.string().min(1).optional(),
    businessCity: z.string().min(1).optional(),
    businessCountry: z.string().min(1).optional(),
    taxId: z.string().min(1).optional(),
    avatarUrl: z.string().url().nullable().optional(),
  }).optional(),
});

router.put('/me/profile', asyncHandler(validateSession), asyncHandler(async (req, res) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const body = profileUpdateSchema.parse(req.body);

  // Update buyer profile if provided
  if (body.buyerProfile) {
    const buyerProfileData: any = {};
    if (body.buyerProfile.firstName !== undefined) buyerProfileData.firstName = body.buyerProfile.firstName;
    if (body.buyerProfile.lastName !== undefined) buyerProfileData.lastName = body.buyerProfile.lastName;
    if (body.buyerProfile.dateOfBirth !== undefined) {
      buyerProfileData.dateOfBirth = body.buyerProfile.dateOfBirth 
        ? new Date(body.buyerProfile.dateOfBirth)
        : null;
    }
    if (body.buyerProfile.address !== undefined) buyerProfileData.address = body.buyerProfile.address;
    if (body.buyerProfile.city !== undefined) buyerProfileData.city = body.buyerProfile.city;
    if (body.buyerProfile.country !== undefined) buyerProfileData.country = body.buyerProfile.country;
    if (body.buyerProfile.preferredPaymentMethod !== undefined) {
      buyerProfileData.preferredPaymentMethod = body.buyerProfile.preferredPaymentMethod;
    }

    await req.prisma.buyerProfile.upsert({
      where: { userId },
      update: buyerProfileData,
      create: {
        userId,
        ...buyerProfileData,
      },
    });
  }

  // Update organizer profile if provided
  if (body.organizerProfile) {
    const organizerProfileData: any = {};
    if (body.organizerProfile.businessName !== undefined) {
      organizerProfileData.businessName = body.organizerProfile.businessName;
    }
    if (body.organizerProfile.businessType !== undefined) {
      organizerProfileData.businessType = body.organizerProfile.businessType;
    }
    if (body.organizerProfile.businessAddress !== undefined) {
      organizerProfileData.businessAddress = body.organizerProfile.businessAddress;
    }
    if (body.organizerProfile.businessCity !== undefined) {
      organizerProfileData.businessCity = body.organizerProfile.businessCity;
    }
    if (body.organizerProfile.businessCountry !== undefined) {
      organizerProfileData.businessCountry = body.organizerProfile.businessCountry;
    }
    if (body.organizerProfile.taxId !== undefined) {
      organizerProfileData.taxId = body.organizerProfile.taxId;
    }
    if (body.organizerProfile.avatarUrl !== undefined) {
      organizerProfileData.avatarUrl = body.organizerProfile.avatarUrl;
    }

    // Mark onboarding as completed if businessName and businessType are provided
    if (body.organizerProfile.businessName && body.organizerProfile.businessType) {
      organizerProfileData.onboardingCompleted = true;
    }

    await req.prisma.organizerProfile.upsert({
      where: { userId },
      update: organizerProfileData,
      create: {
        userId,
        businessName: body.organizerProfile.businessName || 'Untitled Business',
        ...organizerProfileData,
      },
    });

    if (organizerProfileData.avatarUrl !== undefined) {
      const events = await req.prisma.event.findMany({
        where: { organizerId: userId },
        select: { id: true, slug: true },
      });
      await req.redis.invalidateEventCachesForOrganizer(events);
    }
  }

  // Fetch updated user data
  const updatedUser = await req.prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        select: {
          role: true,
          grantedAt: true,
        },
      },
      buyerProfile: true,
      organizerProfile: true,
    },
  });

  res.json({
    success: true,
    data: {
      ...updatedUser,
      roles: updatedUser?.roles.map((r) => r.role) || [],
    },
  });
}));

export default router;
