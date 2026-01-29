import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

const validateSchema = z.object({
  code: z.string(),
  eventId: z.string(),
  amount: z.number(),
});

// POST /api/v1/promo-codes/validate - Validate promo code
router.post('/validate', asyncHandler(async (req, res) => {
  const body = validateSchema.parse(req.body);
  const { code, eventId, amount } = body;

  const promoCode = await req.prisma.promoCode.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!promoCode) {
    return res.status(404).json({ success: false, error: 'Promo code not found' });
  }

  // Check if active
  if (!promoCode.isActive) {
    return res.status(400).json({ success: false, error: 'Promo code is not active' });
  }

  // Check validity dates
  const now = new Date();
  if (now < promoCode.validFrom || now > promoCode.validUntil) {
    return res.status(400).json({ success: false, error: 'Promo code has expired' });
  }

  // Check event applicability
  if (promoCode.eventId && promoCode.eventId !== eventId) {
    return res.status(400).json({ success: false, error: 'Promo code not valid for this event' });
  }

  // Check minimum order amount
  if (promoCode.minOrderAmount && amount < Number(promoCode.minOrderAmount)) {
    return res.status(400).json({
      success: false,
      error: `Minimum order amount is ${promoCode.minOrderAmount}`,
    });
  }

  // Check usage limits
  if (promoCode.maxUses && promoCode.currentUses >= promoCode.maxUses) {
    return res.status(400).json({ success: false, error: 'Promo code has reached maximum uses' });
  }

  // Calculate discount
  let discountAmount = 0;
  if (promoCode.discountType === 'PERCENTAGE') {
    discountAmount = (amount * Number(promoCode.discountValue)) / 100;
  } else {
    discountAmount = Number(promoCode.discountValue);
  }

  // Ensure discount doesn't exceed order amount
  discountAmount = Math.min(discountAmount, amount);

  res.json({
    success: true,
    data: {
      code: promoCode.code,
      discountType: promoCode.discountType,
      discountValue: Number(promoCode.discountValue),
      discountAmount,
      finalAmount: amount - discountAmount,
    },
  });
}));

export default router;
