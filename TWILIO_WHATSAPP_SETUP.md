# Twilio WhatsApp Setup Guide

## Overview
This guide will help you set up Twilio WhatsApp integration for your application. You can use your existing Twilio configuration for template creation and message sending.

## Required Environment Variables

Add these to your `.env.local` file:

```bash
# Twilio Configuration (Required)
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890

# Optional: WhatsApp Business API (for direct Meta integration)
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token_here
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
```

## Step 1: Get Twilio Credentials

1. Go to [Twilio Console](https://console.twilio.com/)
2. Sign in or create an account
3. From the dashboard, copy:
   - **Account SID** → `TWILIO_ACCOUNT_SID`
   - **Auth Token** → `TWILIO_AUTH_TOKEN`

## Step 2: Set up WhatsApp Sandbox (Development)

For development and testing:

1. In Twilio Console, go to **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Follow the WhatsApp Sandbox setup instructions
3. Send a message to the sandbox number to join
4. Use the sandbox number for `TWILIO_WHATSAPP_NUMBER`

Example: `TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886`

## Step 3: Set up Production WhatsApp (Optional)

For production use:

1. In Twilio Console, go to **Messaging** → **Senders** → **WhatsApp senders**
2. Request approval for your WhatsApp Business Profile
3. Once approved, use your approved WhatsApp number

## Step 4: Test Your Configuration

1. Update your `.env.local` file with the credentials
2. Restart your development server
3. Try creating a template in the WhatsApp chat interface
4. Send a test message

## Features Available with Twilio

### ✅ Currently Working
- Template creation using Twilio Content API
- Message sending via Twilio WhatsApp API
- Template management and listing
- Variable substitution in templates

### 🔄 Template Approval Process
- Twilio templates are immediately available for testing
- For WhatsApp Business use, templates need Meta approval
- Submit templates for WhatsApp approval in Twilio Console

## Template Creation

Templates created through the app will:
1. Be stored in Twilio Content API
2. Be immediately available for testing
3. Need separate WhatsApp approval for business use

### Template Categories
- **UTILITY**: Account updates, payment reminders, booking confirmations
- **MARKETING**: Promotions, offers, announcements  
- **AUTHENTICATION**: OTP codes, verification messages

## Troubleshooting

### "Twilio credentials not configured"
- Check that all three Twilio variables are set in `.env.local`
- Restart your development server after updating the file
- Verify credentials are correct in Twilio Console

### Templates not sending
- Check WhatsApp sandbox setup for development
- Verify recipient phone number format (+1234567890)
- Check Twilio logs for delivery status

### Template creation fails
- Ensure template name uses only lowercase, numbers, and underscores
- Check that body text includes proper variable format: {{1}}, {{2}}, etc.
- Verify template content follows WhatsApp guidelines

## Production Checklist

- [ ] Twilio account upgraded from trial
- [ ] WhatsApp Business Profile approved
- [ ] Production WhatsApp sender configured
- [ ] Templates submitted for WhatsApp approval
- [ ] Webhook URLs configured for production

## Support Resources

- [Twilio WhatsApp API Documentation](https://www.twilio.com/docs/whatsapp)
- [Twilio Console](https://console.twilio.com/)
- [WhatsApp Business API Guidelines](https://developers.facebook.com/docs/whatsapp/overview)

## Security Notes

- Never commit `.env.local` to version control
- Rotate Auth Tokens regularly in production
- Monitor usage and costs in Twilio Console
- Use webhook signature validation for production
