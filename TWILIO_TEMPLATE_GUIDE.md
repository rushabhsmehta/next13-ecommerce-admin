# Twilio WhatsApp Template Management Guide

This guide helps you create and manage WhatsApp templates using Twilio's Content API.

## Setup

Your `.env` file already contains the required Twilio credentials:
```
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890
```

## API Endpoints Created

### 1. Create Templates: `/api/twilio/templates`
- **POST**: Create a new Twilio content template
- **GET**: List all existing templates

### 2. Send Template Messages: `/api/twilio/send-template`
- **POST**: Send WhatsApp messages using content templates

### 3. Approval Management: `/api/twilio/approval`
- **GET**: Check WhatsApp approval status
- **POST**: Submit template for WhatsApp approval

## Quick Start Scripts

### Create Common Templates
```bash
cd scripts
node create-twilio-templates.js
```

This script creates 7 common templates:
- booking_confirmation
- payment_reminder
- welcome_message
- trip_update
- payment_received
- birthday_special
- feedback_request

### List Available Templates
```bash
node test-send-template.js
```

### Send a Template Message
```bash
node test-send-template.js [CONTENT_SID] [PHONE_NUMBER]
# Example:
node test-send-template.js HXxxxxxxxxxxxxxxxxxx +919876543210
```

## API Usage Examples

### 1. Create a Template (via API)
```javascript
// POST /api/twilio/templates
{
  "friendlyName": "order_confirmation",
  "language": "en",
  "body": "Hi {{1}}, your order {{2}} has been confirmed. Total: ₹{{3}}",
  "variables": {
    "1": "Customer Name",
    "2": "Order ID", 
    "3": "Amount"
  },
  "category": "UTILITY"
}
```

### 2. Send Template Message (via API)
```javascript
// POST /api/twilio/send-template
{
  "to": "+919876543210",
  "contentSid": "HXxxxxxxxxxxxxxxxxxx",
  "contentVariables": {
    "1": "John Doe",
    "2": "ORD123",
    "3": "5000"
  }
}
```

### 3. Check Approval Status (via API)
```javascript
// GET /api/twilio/approval?contentSid=HXxxxxxxxxxxxxxxxxxx
```

### 4. Submit for WhatsApp Approval (via API)
```javascript
// POST /api/twilio/approval
{
  "contentSid": "HXxxxxxxxxxxxxxxxxxx",
  "name": "order_confirmation",
  "category": "UTILITY"
}
```

## Template Categories

WhatsApp requires templates to be categorized:

- **UTILITY**: Transactional messages (confirmations, updates, notifications)
- **MARKETING**: Promotional messages (offers, announcements)
- **AUTHENTICATION**: OTP and verification messages

## Template Variables

Use `{{1}}`, `{{2}}`, etc. as placeholders in your template body:
```
"Hi {{1}}, your booking for {{2}} is confirmed for {{3}}."
```

When sending, provide values:
```javascript
{
  "contentVariables": {
    "1": "John Doe",
    "2": "Goa Package", 
    "3": "Dec 25, 2024"
  }
}
```

## WhatsApp Approval Process

1. **Create Template**: Templates are created instantly
2. **Submit for Approval**: Required for business-initiated conversations
3. **Review Process**: WhatsApp reviews templates (usually 5 minutes to 24 hours)
4. **Approval Status**: Check status via API or Twilio Console

## Template Guidelines

### DO:
- Use clear, professional language
- Include all necessary information
- Use self-evident variable names
- Follow WhatsApp's content policies

### DON'T:
- Use promotional language in UTILITY templates
- Include misleading information
- Use excessive emojis or formatting
- Include external links without approval

## Error Handling

Common errors and solutions:

1. **Template Creation Failed**
   - Check Twilio credentials
   - Verify template format
   - Ensure unique friendly names

2. **WhatsApp Approval Rejected**
   - Review template content
   - Check category assignment
   - Follow WhatsApp guidelines

3. **Message Send Failed**
   - Verify Content SID exists
   - Check phone number format
   - Ensure template is approved (for business-initiated messages)

## Monitoring and Analytics

- View message logs in Twilio Console
- Check delivery status via API
- Monitor approval status
- Track template usage and success rates

## Next Steps

1. **Create Your Templates**: Run the script or use the API
2. **Submit for Approval**: Submit templates for WhatsApp approval
3. **Test Messaging**: Send test messages to verify functionality
4. **Monitor Performance**: Track delivery and engagement metrics

## Support

- Twilio Console: https://console.twilio.com/
- WhatsApp Templates: https://console.twilio.com/us1/develop/content/templates
- Twilio Docs: https://www.twilio.com/docs/content-api

For additional help, check the Twilio Console logs and error messages.
