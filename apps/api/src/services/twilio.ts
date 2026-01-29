import twilio from 'twilio';

export class TwilioService {
  private client: twilio.Twilio | null = null;
  private phoneNumber: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER || '';

    if (accountSid && authToken) {
      this.client = twilio(accountSid, authToken);
    }
  }

  async sendTicketConfirmation(to: string, orderNumber: string): Promise<void> {
    if (!this.client || !this.phoneNumber) {
      console.warn('Twilio not configured, skipping SMS send');
      return;
    }

    try {
      await this.client.messages.create({
        body: `Your tickets are ready! Order: ${orderNumber}. Check your email for ticket PDFs. - getiickets`,
        from: this.phoneNumber,
        to: to,
      });
    } catch (error: any) {
      console.error('Twilio SMS error:', error.message);
      throw new Error('Failed to send SMS');
    }
  }
}
