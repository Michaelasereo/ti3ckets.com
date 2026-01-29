require('dotenv').config();
const { BrevoService } = require('./src/services/brevo');

async function testEmail() {
  const brevoService = new BrevoService();
  
  console.log('Testing email service...');
  console.log('API Key configured:', !!process.env.BREVO_API_KEY);
  console.log('API Key length:', process.env.BREVO_API_KEY?.length || 0);
  console.log('Sender Email:', process.env.BREVO_SENDER_EMAIL);
  console.log('Sender Name:', process.env.BREVO_SENDER_NAME);
  
  try {
    await brevoService.sendVerificationEmail(
      'test@example.com',
      '123456',
      'Test User'
    );
    console.log('✅ Email sent successfully!');
  } catch (error) {
    console.error('❌ Error sending email:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testEmail();
