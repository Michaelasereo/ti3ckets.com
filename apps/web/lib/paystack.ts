import axios from 'axios';
import crypto from 'crypto';

export class PaystackService {
  private readonly baseURL = 'https://api.paystack.co';
  private readonly secretKey: string;

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY || '';
    if (!this.secretKey) {
      throw new Error('PAYSTACK_SECRET_KEY is required');
    }
  }

  async initializeTransaction(data: {
    email: string;
    amount: number;
    reference: string;
    metadata?: Record<string, unknown>;
    callback_url?: string;
  }) {
    try {
      const response = await axios.post(
        `${this.baseURL}/transaction/initialize`,
        data,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );
      return response.data;
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string; response?: { data?: { message?: string } } };
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        throw new Error('Payment initialization timed out. Please try again.');
      }
      throw new Error(err.response?.data?.message || 'Failed to initialize payment');
    }
  }

  async verifyTransaction(reference: string) {
    try {
      const response = await axios.get(
        `${this.baseURL}/transaction/verify/${reference}`,
        {
          headers: { Authorization: `Bearer ${this.secretKey}` },
          timeout: 30000,
        }
      );
      return response.data;
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string; response?: { data?: { message?: string } } };
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        throw new Error('Payment verification timed out. Please try again.');
      }
      throw new Error(err.response?.data?.message || 'Failed to verify payment');
    }
  }

  verifyWebhookSignature(payload: string | object, signature: string): boolean {
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const hash = crypto.createHmac('sha512', this.secretKey).update(body).digest('hex');
    return hash === signature;
  }
}
