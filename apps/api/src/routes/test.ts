import { Router } from 'express';
import { z } from 'zod';
import { BrevoService } from '../services/brevo';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

const brevoService = new BrevoService();

const testEmailSchema = z.object({
  email: z.string().email(),
});

// POST /api/v1/test/email - Send test email
router.post('/email', asyncHandler(async (req, res) => {
  // Only allow in development or with proper authentication
  if (process.env.NODE_ENV === 'production' && !req.headers.authorization) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const body = testEmailSchema.parse(req.body);
  const { email } = body;

  try {
    console.log(`Sending test email to ${email}`);

    // Send simple test email
    await brevoService.sendTestEmail(email);

    res.json({
      success: true,
      message: `Test email sent successfully to ${email}`,
      data: {
        recipient: email,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Failed to send test email', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send test email',
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      } : undefined,
    });
  }
}));

// GET /api/v1/test/email/config - Check email configuration
router.get('/email/config', asyncHandler(async (req, res) => {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const apiKey = process.env.BREVO_API_KEY || '';
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@getiickets.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'getiickets';

  res.json({
    success: true,
    data: {
      apiKeyConfigured: !!apiKey,
      apiKeyLength: apiKey.length,
      senderEmail,
      senderName,
      baseURL: 'https://api.brevo.com/v3',
    },
  });
}));

export default router;
