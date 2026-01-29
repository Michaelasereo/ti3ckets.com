# Email Testing Guide

This guide shows you how to test the email service (Brevo) to ensure it's working correctly.

## Test Endpoints

### 1. Check Email Configuration

**Endpoint:** `GET /api/v1/test/email/config`

**Usage:**
```bash
curl http://localhost:8080/api/v1/test/email/config
```

**Response:**
```json
{
  "success": true,
  "data": {
    "apiKeyConfigured": true,
    "apiKeyLength": 64,
    "senderEmail": "noreply@getiickets.com",
    "senderName": "getiickets",
    "baseURL": "https://api.brevo.com/v3"
  }
}
```

### 2. Send Test Email

**Endpoint:** `POST /api/v1/test/email`

**Request Body:**
```json
{
  "email": "your-email@example.com"
}
```

**Usage with cURL:**
```bash
curl -X POST http://localhost:8080/api/v1/test/email \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com"}'
```

**Usage with JavaScript/Fetch:**
```javascript
fetch('http://localhost:8080/api/v1/test/email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'your-email@example.com'
  })
})
  .then(res => res.json())
  .then(data => console.log(data));
```

**Success Response:**
```json
{
  "success": true,
  "message": "Test email sent successfully to your-email@example.com",
  "data": {
    "recipient": "your-email@example.com",
    "timestamp": "2026-01-25T12:00:00.000Z"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Failed to send test email",
  "details": {
    "message": "...",
    "response": {...},
    "status": 400
  }
}
```

## What the Test Email Contains

The test email includes:
- A confirmation that the email service is working
- Email configuration details (sender, service name)
- Status indicators showing what's working

## Troubleshooting

### Email Not Received

1. **Check Spam/Junk Folder** - Test emails sometimes end up in spam
2. **Verify Brevo API Key** - Use the config endpoint to check
3. **Check Sender Email Verification** - The sender email must be verified in Brevo
4. **Check Server Logs** - Look for error messages in the API logs

### Common Errors

- **"Brevo API key not configured"** - Set `BREVO_API_KEY` in environment variables
- **"Invalid sender"** - Verify the sender email in Brevo dashboard
- **"Invalid recipient"** - Check the email address format
- **Rate limiting** - Too many requests, wait a few minutes

## Environment Variables Required

Make sure these are set in your `.env` file:

```env
BREVO_API_KEY=your_brevo_api_key_here
BREVO_SENDER_EMAIL=noreply@getiickets.com
BREVO_SENDER_NAME=getiickets
```

## Production Note

In production, the test endpoints require authentication. Make sure to include proper authorization headers if testing in production.
