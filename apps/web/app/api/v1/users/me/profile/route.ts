import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, ApiError } from '@/lib/auth';
import { prisma } from '@/lib/db';

const profileUpdateSchema = z.object({
  buyerProfile: z
    .object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      dateOfBirth: z.string().nullable().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      preferredPaymentMethod: z.string().nullable().optional(),
    })
    .optional(),
  organizerProfile: z
    .object({
      businessName: z.string().min(1).optional(),
      businessType: z.string().min(1).optional(),
      businessAddress: z.string().min(1).optional(),
      businessCity: z.string().min(1).optional(),
      businessCountry: z.string().min(1).optional(),
      taxId: z.string().min(1).optional(),
      avatarUrl: z.string().url().nullable().optional(),
    })
    .optional(),
});

export async function PUT(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const parsed = profileUpdateSchema.parse(body);

    if (parsed.buyerProfile) {
      const data: Record<string, unknown> = {};
      if (parsed.buyerProfile.firstName !== undefined) data.firstName = parsed.buyerProfile.firstName;
      if (parsed.buyerProfile.lastName !== undefined) data.lastName = parsed.buyerProfile.lastName;
      if (parsed.buyerProfile.dateOfBirth !== undefined) {
        data.dateOfBirth = parsed.buyerProfile.dateOfBirth
          ? new Date(parsed.buyerProfile.dateOfBirth)
          : null;
      }
      if (parsed.buyerProfile.address !== undefined) data.address = parsed.buyerProfile.address;
      if (parsed.buyerProfile.city !== undefined) data.city = parsed.buyerProfile.city;
      if (parsed.buyerProfile.country !== undefined) data.country = parsed.buyerProfile.country;
      if (parsed.buyerProfile.preferredPaymentMethod !== undefined) {
        data.preferredPaymentMethod = parsed.buyerProfile.preferredPaymentMethod;
      }

      await prisma.buyerProfile.upsert({
        where: { userId: user.userId },
        update: data,
        create: { userId: user.userId, ...data },
      });
    }

    if (parsed.organizerProfile) {
      const data: Record<string, unknown> = {};
      if (parsed.organizerProfile.businessName !== undefined)
        data.businessName = parsed.organizerProfile.businessName;
      if (parsed.organizerProfile.businessType !== undefined)
        data.businessType = parsed.organizerProfile.businessType;
      if (parsed.organizerProfile.businessAddress !== undefined)
        data.businessAddress = parsed.organizerProfile.businessAddress;
      if (parsed.organizerProfile.businessCity !== undefined)
        data.businessCity = parsed.organizerProfile.businessCity;
      if (parsed.organizerProfile.businessCountry !== undefined)
        data.businessCountry = parsed.organizerProfile.businessCountry;
      if (parsed.organizerProfile.taxId !== undefined) data.taxId = parsed.organizerProfile.taxId;
      if (parsed.organizerProfile.avatarUrl !== undefined)
        data.avatarUrl = parsed.organizerProfile.avatarUrl;
      if (parsed.organizerProfile.businessName && parsed.organizerProfile.businessType) {
        data.onboardingCompleted = true;
      }

      await prisma.organizerProfile.upsert({
        where: { userId: user.userId },
        update: data,
        create: {
          userId: user.userId,
          businessName: (parsed.organizerProfile.businessName as string) || 'Untitled Business',
          ...data,
        },
      });
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        roles: { select: { role: true, grantedAt: true } },
        buyerProfile: true,
        organizerProfile: true,
      },
    });

    if (!updatedUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...updatedUser,
        roles: updatedUser.roles.map((r) => r.role),
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation error', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
