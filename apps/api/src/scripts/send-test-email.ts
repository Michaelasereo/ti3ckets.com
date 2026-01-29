import 'dotenv/config';
import { BrevoService } from '../services/brevo';

async function sendTestEmail() {
  const email = 'asereope@gmail.com';
  const brevoService = new BrevoService();

  try {
    console.log(`Sending test email to ${email}...`);
    await brevoService.sendTestEmail(email);
    console.log(`✅ Test email sent successfully to ${email}`);
    console.log('Please check your inbox (and spam folder) for the test email.');
  } catch (error: any) {
    console.error('❌ Failed to send test email:');
    console.error(error.message);
    if (error.response?.data) {
      console.error('Error details:', error.response.data);
    }
    process.exit(1);
  }
}

sendTestEmail();
