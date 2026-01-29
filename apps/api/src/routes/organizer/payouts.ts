import { Router } from 'express';
import { z } from 'zod';
import { requireRoleMiddleware } from '../../middleware/auth';
import { Role } from '@prisma/client';
import { asyncHandler } from '../../middleware/asyncHandler';
import { PayoutService } from '../../services/payout';

const router = Router();
const payoutService = new PayoutService();

const setupBankAccountSchema = z.object({
  name: z.string().min(1),
  account_number: z.string().min(10).max(10),
  bank_code: z.string().min(1),
});

const requestPayoutSchema = z.object({
  amount: z.number().positive(),
  recipientCode: z.string().optional(), // If not provided, use stored payoutDetails
});

// GET /api/v1/organizer/payouts/balance - Get payout balances
router.get('/balance', requireRoleMiddleware(Role.ORGANIZER), asyncHandler(async (req, res) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const balances = await payoutService.calculateBalances(req.prisma, userId);

  res.json({
    success: true,
    data: balances,
  });
}));

// GET /api/v1/organizer/payouts - List payout history
router.get('/', requireRoleMiddleware(Role.ORGANIZER), asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const query = req.query as { page?: string; limit?: string; status?: string };

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const page = query.page ? parseInt(query.page, 10) : 1;
  const limit = query.limit ? parseInt(query.limit, 10) : 20;
  const skip = (page - 1) * limit;

  const where: any = { organizerId: userId };
  if (query.status) {
    where.status = query.status;
  }

  const [payouts, total] = await Promise.all([
    req.prisma.payout.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    req.prisma.payout.count({ where }),
  ]);

  res.json({
    success: true,
    data: payouts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}));

// GET /api/v1/organizer/payouts/:id - Get payout details
router.get('/:id', requireRoleMiddleware(Role.ORGANIZER), asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const payout = await req.prisma.payout.findFirst({
    where: {
      id,
      organizerId: userId,
    },
  });

  if (!payout) {
    return res.status(404).json({ success: false, error: 'Payout not found' });
  }

  res.json({
    success: true,
    data: payout,
  });
}));

// POST /api/v1/organizer/payouts/setup - Setup bank account
router.post('/setup', requireRoleMiddleware(Role.ORGANIZER), asyncHandler(async (req, res) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const body = setupBankAccountSchema.parse(req.body);

  // Create transfer recipient in Paystack
  const recipientResponse = await payoutService.setupBankAccount({
    type: 'nuban',
    name: body.name,
    account_number: body.account_number,
    bank_code: body.bank_code,
    currency: 'NGN',
  });

  if (!recipientResponse.status) {
    return res.status(400).json({
      success: false,
      error: recipientResponse.message || 'Failed to setup bank account',
    });
  }

  // Store payout details in organizer profile
  const payoutDetails = {
    recipientCode: recipientResponse.data.recipient_code,
    accountNumber: body.account_number,
    bankCode: body.bank_code,
    bankName: recipientResponse.data.details?.bank_name || '',
    accountName: recipientResponse.data.details?.account_name || body.name,
    setupAt: new Date().toISOString(),
  };

  await req.prisma.organizerProfile.update({
    where: { userId },
    data: {
      payoutDetails: payoutDetails as any,
    },
  });

  res.json({
    success: true,
    data: {
      recipientCode: recipientResponse.data.recipient_code,
      details: payoutDetails,
    },
  });
}));

// POST /api/v1/organizer/payouts/request - Request payout
router.post('/request', requireRoleMiddleware(Role.ORGANIZER), asyncHandler(async (req, res) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const body = requestPayoutSchema.parse(req.body);

  // Check balances
  const balances = await payoutService.calculateBalances(req.prisma, userId);

  // Validate amount
  if (body.amount > balances.availableBalance) {
    return res.status(400).json({
      success: false,
      error: 'Amount exceeds available balance',
    });
  }

  const minimumThreshold = payoutService.getMinimumPayoutThreshold();
  if (body.amount < minimumThreshold) {
    return res.status(400).json({
      success: false,
      error: `Minimum payout amount is ${minimumThreshold.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}`,
    });
  }

  // Get organizer profile for payout details
  const organizerProfile = await req.prisma.organizerProfile.findUnique({
    where: { userId },
  });

  if (!organizerProfile) {
    return res.status(404).json({ success: false, error: 'Organizer profile not found' });
  }

  const payoutDetails = organizerProfile.payoutDetails as any;
  if (!payoutDetails?.recipientCode && !body.recipientCode) {
    return res.status(400).json({
      success: false,
      error: 'Bank account not setup. Please setup your bank account first.',
    });
  }

  const recipientCode = body.recipientCode || payoutDetails.recipientCode;

  // Create payout record
  const payout = await req.prisma.payout.create({
    data: {
      organizerId: userId,
      amount: body.amount,
      currency: 'NGN',
      status: 'PENDING',
      bankAccount: payoutDetails || {},
    },
  });

  // Initiate transfer via Paystack (async, don't block response)
  payoutService.initiateTransfer({
    source: 'balance',
    amount: Math.round(body.amount * 100), // Convert to kobo
    recipient: recipientCode,
    reason: `Event ticket sales payout - ${payout.id}`,
  })
    .then(async (transferResponse) => {
      if (transferResponse.status) {
        // Update payout with Paystack reference and mark as processing
        await req.prisma.payout.update({
          where: { id: payout.id },
          data: {
            paystackRef: transferResponse.data.reference || transferResponse.data.transfer_code,
            status: 'PROCESSING',
          },
        });
      } else {
        // Mark as failed
        await req.prisma.payout.update({
          where: { id: payout.id },
          data: {
            status: 'FAILED',
            failureReason: transferResponse.message || 'Transfer initiation failed',
          },
        });
      }
    })
    .catch(async (error) => {
      console.error('Error initiating payout transfer:', error);
      await req.prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: 'FAILED',
          failureReason: error.message || 'Transfer initiation failed',
        },
      });
    });

  res.json({
    success: true,
    data: payout,
    message: 'Payout request submitted. Status will be updated once processing begins.',
  });
}));

export default router;
