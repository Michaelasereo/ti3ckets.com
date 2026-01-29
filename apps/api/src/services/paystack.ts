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
    amount: number; // in kobo
    reference: string;
    metadata?: {
      orderId: string;
      eventId: string;
      userId?: string;
      [key: string]: any;
    };
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
          timeout: 30000, // 30 second timeout
        }
      );

      return response.data;
    } catch (error: any) {
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.error('Paystack initialization timeout:', error.message);
        throw new Error('Payment initialization timed out. Please try again.');
      }
      console.error('Paystack initialization error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to initialize payment');
    }
  }

  async verifyTransaction(reference: string) {
    try {
      const response = await axios.get(
        `${this.baseURL}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
          timeout: 30000, // 30 second timeout
        }
      );

      return response.data;
    } catch (error: any) {
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.error('Paystack verification timeout:', error.message);
        throw new Error('Payment verification timed out. Please try again.');
      }
      console.error('Paystack verification error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to verify payment');
    }
  }

  verifyWebhookSignature(payload: any, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return hash === signature;
  }

  async createTransferRecipient(accountDetails: {
    type: 'nuban';
    name: string;
    account_number: string;
    bank_code: string;
    currency?: 'NGN';
  }) {
    const response = await axios.post(
      `${this.baseURL}/transferrecipient`,
      accountDetails,
      {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }
}
