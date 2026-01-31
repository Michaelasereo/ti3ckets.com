import axios from 'axios';

export class BrevoService {
  private readonly apiKey: string;
  private readonly baseURL = 'https://api.brevo.com/v3';
  private readonly senderEmail: string;
  private readonly senderName: string;

  constructor() {
    this.apiKey = process.env.BREVO_API_KEY || '';
    this.senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@getiickets.com';
    this.senderName = process.env.BREVO_SENDER_NAME || 'getiickets';
  }

  async sendVerificationEmail(
    to: string,
    code: string,
    name?: string,
    retries: number = 3
  ): Promise<void> {
    if (!this.apiKey) {
      throw new Error(
        'Brevo API key not configured. Set BREVO_API_KEY in .env.local.'
      );
    }

    const emailPayload = {
      sender: {
        name: this.senderName,
        email: this.senderEmail,
      },
      to: [{ email: to, name: name || 'User' }],
      subject: 'Verify your getiickets account',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a1a1a; margin: 0;">Verify Your Email</h1>
          </div>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">
              Hi${name ? ` ${name}` : ''},
            </p>
            <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">
              Thank you for signing up for getiickets! Please use the verification code below to verify your email address:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="display: inline-block; background-color: #1a1a1a; color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px 40px; border-radius: 8px; font-family: 'Courier New', monospace;">
                ${code}
              </div>
            </div>
            
            <p style="color: #666; font-size: 14px; margin: 20px 0 0 0;">
              This code will expire in 15 minutes. If you didn't request this verification, you can safely ignore this email.
            </p>
          </div>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px; text-align: center;">
            This is an automated email from getiickets. Please do not reply to this message.
          </p>
        </div>
      `,
    };

    const headers = {
      'api-key': this.apiKey,
      'Content-Type': 'application/json',
    };

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        await axios.post(`${this.baseURL}/smtp/email`, emailPayload, { headers });
        return;
      } catch (error: unknown) {
        const err = error as { response?: { status: number; data?: unknown }; code?: string; message?: string };
        const isLastAttempt = attempt === retries - 1;
        const isRetryableError =
          (err.response?.status ?? 0) >= 500 ||
          err.response?.status === 429 ||
          err.code === 'ECONNRESET' ||
          err.code === 'ETIMEDOUT' ||
          err.code === 'ENOTFOUND';

        if (isLastAttempt || !isRetryableError) {
          console.error('Brevo verification email error:', err.response?.data ?? err.message);
          throw new Error('Failed to send verification email');
        }
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
  }
}
