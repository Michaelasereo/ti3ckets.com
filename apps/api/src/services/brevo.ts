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

  async sendTicketConfirmation(
    to: string,
    order: any,
    event: any,
    retries: number = 3
  ): Promise<void> {
    if (!this.apiKey) {
      console.warn('Brevo API key not configured, skipping email send');
      return;
    }

    const emailPayload = {
      sender: {
        name: this.senderName,
        email: this.senderEmail,
      },
      to: [{ email: to, name: order.customerName || 'Customer' }],
      subject: `Your Tickets for ${event.title}`,
      htmlContent: `
        <h2>Thank you for your purchase!</h2>
        <p>Your tickets for <strong>${event.title}</strong> are ready.</p>
        <h3>Event Details:</h3>
        <ul>
          <li><strong>Date:</strong> ${new Date(event.startDateTime).toLocaleDateString('en-NG')}</li>
          <li><strong>Time:</strong> ${new Date(event.startDateTime).toLocaleTimeString('en-NG')}</li>
          <li><strong>Venue:</strong> ${event.venueName}</li>
          <li><strong>Address:</strong> ${event.venueAddress}, ${event.city}</li>
        </ul>
        <h3>Order Information:</h3>
        <ul>
          <li><strong>Order Number:</strong> ${order.orderNumber}</li>
          <li><strong>Total Amount:</strong> ₦${Number(order.totalAmount).toLocaleString()}</li>
        </ul>
        ${order.tickets?.length ? `
        <h3>Your Ticket(s):</h3>
        <ul>
          ${order.tickets.map((t: any) => `<li><strong>Ticket #${t.ticketNumber}</strong>${t.ticketType ? ` – ${t.ticketType.name}` : ''}</li>`).join('')}
        </ul>
        ` : ''}
        <p>Your ticket PDFs are attached. Please present them at the venue.</p>
        <p>You can also view your tickets in your dashboard: <a href="${process.env.FRONTEND_URL}/dashboard/tickets">View Tickets</a></p>
        <p>Thank you for choosing getiickets!</p>
      `,
      attachments: order.tickets
        .filter((ticket: any) => ticket.pdfUrl)
        .map((ticket: any) => ({
          name: `ticket-${ticket.ticketNumber}.pdf`,
          url: ticket.pdfUrl,
        })),
    };

    const headers = {
      'api-key': this.apiKey,
      'Content-Type': 'application/json',
    };

    // Retry logic with exponential backoff
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        await axios.post(`${this.baseURL}/smtp/email`, emailPayload, { headers });
        return; // Success, exit function
      } catch (error: any) {
        const isLastAttempt = attempt === retries - 1;
        const isRetryableError = 
          error.response?.status >= 500 || // Server errors
          error.response?.status === 429 || // Rate limiting
          error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ENOTFOUND';

        if (isLastAttempt || !isRetryableError) {
          // Last attempt or non-retryable error - log and throw
          console.error('Brevo email error (final attempt):', {
            attempt: attempt + 1,
            error: error.response?.data || error.message,
            status: error.response?.status,
          });
          throw new Error('Failed to send confirmation email');
        }

        // Calculate exponential backoff delay: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`Brevo email attempt ${attempt + 1} failed, retrying in ${delay}ms...`, {
          error: error.response?.data || error.message,
        });
        
        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Notify the event organizer that a new order was placed for their event.
   */
  async sendOrganizerOrderNotification(
    organizerEmail: string,
    organizerName: string | null,
    order: any,
    event: any,
    retries: number = 3
  ): Promise<void> {
    if (!this.apiKey) {
      console.warn('Brevo API key not configured, skipping organizer notification');
      return;
    }

    const ordersUrl = `${process.env.FRONTEND_URL || ''}/organizer/events/${event.id}/orders`;
    const emailPayload = {
      sender: {
        name: this.senderName,
        email: this.senderEmail,
      },
      to: [{ email: organizerEmail, name: organizerName || 'Organizer' }],
      subject: `New order for ${event.title}`,
      htmlContent: `
        <h2>New order received</h2>
        <p>A new order has been placed for your event <strong>${event.title}</strong>.</p>
        <h3>Order summary</h3>
        <ul>
          <li><strong>Order number:</strong> ${order.orderNumber}</li>
          <li><strong>Customer:</strong> ${order.customerName || order.customerEmail}</li>
          <li><strong>Email:</strong> ${order.customerEmail}</li>
          <li><strong>Total:</strong> ₦${Number(order.totalAmount).toLocaleString()} ${order.currency || 'NGN'}</li>
        </ul>
        <p><a href="${ordersUrl}">View orders for this event</a></p>
        <p>— getiickets</p>
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
      } catch (error: any) {
        const isLastAttempt = attempt === retries - 1;
        const isRetryableError =
          error.response?.status >= 500 ||
          error.response?.status === 429 ||
          error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ENOTFOUND';
        if (isLastAttempt || !isRetryableError) {
          console.error('Brevo organizer notification error:', error.response?.data || error.message);
          return; // Don't throw – organizer email is non-critical
        }
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
  }

  async sendTestEmail(to: string): Promise<void> {
    if (!this.apiKey) {
      throw new Error('Brevo API key not configured');
    }

    const emailPayload = {
      sender: {
        name: this.senderName,
        email: this.senderEmail,
      },
      to: [{ email: to, name: 'Test User' }],
      subject: 'Test Email from getiickets',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a;">✅ Email Service Test</h2>
          <p>This is a test email from <strong>getiickets</strong> to verify that the email service is working correctly.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Email Configuration:</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li><strong>Sender:</strong> ${this.senderName} (${this.senderEmail})</li>
              <li><strong>Service:</strong> Brevo (formerly Sendinblue)</li>
              <li><strong>Status:</strong> ✅ Active</li>
            </ul>
          </div>

          <p>If you received this email, it means:</p>
          <ul>
            <li>✅ Brevo API key is configured correctly</li>
            <li>✅ Email service is operational</li>
            <li>✅ Sender email is verified in Brevo</li>
          </ul>

          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This is an automated test email. You can safely ignore it.
          </p>
        </div>
      `,
    };

    const headers = {
      'api-key': this.apiKey,
      'Content-Type': 'application/json',
    };

    try {
      const response = await axios.post(`${this.baseURL}/smtp/email`, emailPayload, { headers });
      console.log('Email sent successfully:', response.data);
    } catch (error: any) {
      const errorDetails = error.response?.data || {};
      console.error('Brevo test email error:', {
        message: errorDetails.message || error.message,
        code: errorDetails.code,
        status: error.response?.status,
        fullError: errorDetails,
      });
      
      // Provide more helpful error messages
      if (errorDetails.code === 'permission_denied' || errorDetails.message?.includes('not yet activated')) {
        throw new Error(
          `SMTP account not activated. Please:\n` +
          `1. Log in to your Brevo dashboard (https://app.brevo.com)\n` +
          `2. Go to Senders & IP section\n` +
          `3. Verify your sender email: ${this.senderEmail}\n` +
          `4. Complete any account activation steps\n` +
          `5. Contact Brevo support if issues persist: contact@brevo.com`
        );
      }
      
      throw new Error(errorDetails.message || error.message || 'Failed to send test email');
    }
  }

  async sendVerificationEmail(
    to: string,
    code: string,
    name?: string,
    retries: number = 3
  ): Promise<void> {
    if (!this.apiKey) {
      throw new Error(
        'Brevo API key not configured. Set BREVO_API_KEY in .env. ' +
          'See ENV_VARIABLES.md or apps/api/TEST_EMAIL.md for setup.'
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

    // Retry logic with exponential backoff
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        await axios.post(`${this.baseURL}/smtp/email`, emailPayload, { headers });
        return; // Success, exit function
      } catch (error: any) {
        const isLastAttempt = attempt === retries - 1;
        const isRetryableError = 
          error.response?.status >= 500 ||
          error.response?.status === 429 ||
          error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ENOTFOUND';

        if (isLastAttempt || !isRetryableError) {
          const errorDetails = error.response?.data || {};
          const errorMessage = errorDetails.message || error.message || 'Unknown error';
          console.error('Brevo verification email error (final attempt):', {
            attempt: attempt + 1,
            error: errorDetails,
            status: error.response?.status,
            message: errorMessage,
            code: errorDetails.code,
          });
          // Preserve the original error message for better debugging
          throw new Error(`Failed to send verification email: ${errorMessage}`);
        }

        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`Brevo verification email attempt ${attempt + 1} failed, retrying in ${delay}ms...`, {
          error: error.response?.data || error.message,
        });
        
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}
