# Meta WhatsApp Business API Integration

## Overview

This project now supports **Meta WhatsApp Business API** (Facebook Graph API) integration alongside the existing AiSensy provider. The system automatically selects the provider based on your environment configuration.

## Provider Selection Logic

- **Meta**: Used if both `META_WHATSAPP_PHONE_NUMBER_ID` and `META_WHATSAPP_ACCESS_TOKEN` are configured
- **AiSensy**: Used as fallback if Meta credentials are not available

## Environment Variables

### Required for Meta WhatsApp

Add these to your `.env` or `.env.local` file:

```bash
# Meta WhatsApp Business API Configuration
META_WHATSAPP_PHONE_NUMBER_ID=131371496722301
META_WHATSAPP_ACCESS_TOKEN=EAAVramqNmOUBPo4KSL9HjZBpFEo4pQO2MZCtG4bHpy4D0E1O7Ru2ks0yI0eZCJWIc72umrkifDMnjHuJuMJjcWSzwUXYsMJph1XQrlsq8wic7ZAfYD6gYmVuGPEeEMQZCxVAjUuEfxYzQnR1qiyDZAbfTctnd3PvLEK1HpMVfV8ZBCkFNf9ekVIJR3IwNQeu3YYoIyFs8ZA8yDyKnZBWdhI9fvWpfH4uHwjYjT3aclSBxvPoENaUZD
```

### Optional for Meta WhatsApp

```bash
# Meta Graph API Version (defaults to v22.0)
META_GRAPH_API_VERSION=v22.0
```

## Getting Your Meta WhatsApp Credentials

### 1. App ID & App Secret
- Go to [Facebook Developers](https://developers.facebook.com/)
- Navigate to your WhatsApp Business App
- Find these in **Settings > Basic**

### 2. Phone Number ID
- In your WhatsApp Business App, go to **WhatsApp > API Setup**
- Copy the **Phone Number ID** (e.g., `131371496722301`)

### 3. Permanent Access Token
- Go to **WhatsApp > API Setup**
- Click on **Generate Token** or use the System User approach for permanent tokens
- For production, create a System User:
  1. Go to **Business Settings > System Users**
  2. Create a new System User
  3. Assign it to your WhatsApp Business App
  4. Generate a permanent token with `whatsapp_business_messaging` permission

### 4. Test Phone Number
- Add test phone numbers in **WhatsApp > API Setup**
- Verify them via the 6-digit code sent to the number

## API Usage

### Sending a Template Message

The Meta integration supports WhatsApp message templates approved by Meta.

#### Using the Library Directly

```typescript
import { sendWhatsAppMessage } from '@/lib/whatsapp';

const result = await sendWhatsAppMessage({
  to: '+919978783238',
  templateParams: [], // Empty for hello_world template
  campaignName: 'hello_world', // Template name
  saveToDb: true,
});

console.log('Message sent:', result.messageSid);
```

#### Using the API Endpoint

```bash
curl -X POST http://localhost:3000/api/whatsapp/send \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "+919978783238",
    "templateParams": [],
    "campaignName": "hello_world",
    "saveToDb": true
  }'
```

#### Template with Parameters

```typescript
await sendWhatsAppMessage({
  to: '+919978783238',
  templateParams: ['John Doe', 'December 25, 2024'],
  campaignName: 'booking_confirmation',
  saveToDb: true,
});
```

### Sending a Text Message

```typescript
await sendWhatsAppMessage({
  to: '+919978783238',
  message: 'Hello from Meta WhatsApp!',
  saveToDb: true,
});
```

### Using the cURL Command (Like Your Example)

```powershell
curl -i -X POST `
  https://graph.facebook.com/v22.0/131371496722301/messages `
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' `
  -H 'Content-Type: application/json' `
  -d '{ \"messaging_product\": \"whatsapp\", \"to\": \"919978783238\", \"type\": \"template\", \"template\": { \"name\": \"hello_world\", \"language\": { \"code\": \"en_US\" } } }'
```

This is now integrated into the system! Just use the higher-level API endpoints.

## Features

### ✅ Automatic Provider Selection
The system automatically uses Meta if configured, otherwise falls back to AiSensy.

### ✅ Template Messages
Send pre-approved WhatsApp templates with dynamic parameters.

### ✅ Text Messages
Send plain text messages (requires approved 24-hour conversation window or template).

### ✅ Database Logging
All messages are logged to the `WhatsAppMessage` table with provider information.

### ✅ Error Handling
Comprehensive error handling with detailed error messages from Meta API.

### ✅ Existing API Compatibility
All existing API endpoints (`/api/whatsapp/send`, `/api/whatsapp/send-template`) work with both providers.

## Testing

### Run the Test Script

```powershell
node scripts/whatsapp/test-meta-whatsapp.js
```

This script will:
1. Check your environment variables
2. Test direct Meta Graph API calls
3. Test through your local API endpoints
4. Verify database logging

## API Endpoints

All existing WhatsApp endpoints now support Meta:

### POST `/api/whatsapp/send`
Send a message through the active provider.

**Request:**
```json
{
  "to": "+919978783238",
  "message": "Hello!",
  "saveToDb": true,
  "campaignName": "hello_world",
  "templateParams": []
}
```

**Response:**
```json
{
  "success": true,
  "messageSid": "wamid.HBgLOTE5OTc4NzgzMjM4FQIAERgSNjM0RjMyODQxREE3Q0I0MUJBAA==",
  "status": "Message sent successfully",
  "provider": "meta",
  "dbRecord": { ... }
}
```

### POST `/api/whatsapp/send-template`
Send a template message with variables.

### GET `/api/whatsapp/messages?limit=50`
Get recent WhatsApp messages from database.

### GET `/api/whatsapp/config`
Get current WhatsApp configuration and active provider.

## Data Model

Messages are stored in the `WhatsAppMessage` table:

```prisma
model WhatsAppMessage {
  id            String   @id @default(uuid())
  to            String?
  from          String?
  message       String?  @db.Text
  messageSid    String?  // Meta message ID
  status        String   @default("pending")
  direction     String   @default("outbound")
  errorCode     String?
  errorMessage  String?  @db.Text
  sentAt        DateTime?
  deliveredAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

## Meta-Specific Notes

### Message Templates
- All templates must be pre-approved by Meta
- Template names are case-sensitive
- Language codes must match Meta's format (e.g., `en_US`)

### Phone Numbers
- Must be in E.164 format without the `+` prefix when sent to API
- The system automatically handles formatting

### Rate Limits
- Meta has conversation-based pricing
- Check your Meta Business account for limits
- Consider implementing rate limiting for production

### Message Status
- Meta provides webhook callbacks for message status updates
- Implement webhook handling at `/api/whatsapp/webhook` for delivery status

## Security Considerations

### Access Token Security
- **Never commit access tokens to git**
- Use environment variables for all sensitive data
- Rotate tokens regularly
- Use System User tokens for production

### Token Expiration
- Permanent tokens don't expire but can be revoked
- Monitor token validity in Meta Business Manager

### Rate Limiting
- Implement rate limiting on your API endpoints
- Monitor usage to avoid Meta API throttling

## Troubleshooting

### "Missing Meta WhatsApp configuration"
- Verify `META_WHATSAPP_PHONE_NUMBER_ID` and `META_WHATSAPP_ACCESS_TOKEN` are set
- Check `.env` or `.env.local` files
- Restart your Next.js server after updating env vars

### "Template not found"
- Ensure the template is approved in Meta Business Manager
- Template names are case-sensitive
- Verify the template exists for your WhatsApp Business Account

### "Recipient phone number not a WhatsApp user"
- Number must have WhatsApp installed
- For testing, add number to approved test numbers in Meta dashboard

### "Invalid OAuth access token"
- Token may have expired or been revoked
- Generate a new permanent token
- Verify the token has `whatsapp_business_messaging` permission

## Migration from AiSensy

The system automatically uses Meta when configured. To migrate:

1. Add Meta credentials to `.env` or `.env.local`
2. Restart your Next.js server
3. All existing code continues to work
4. Verify provider in API responses (`"provider": "meta"`)

To switch back to AiSensy, simply remove or comment out Meta credentials.

## Example Integration Flows

### Customer Booking Confirmation

```typescript
import { sendWhatsAppMessage } from '@/lib/whatsapp';

async function sendBookingConfirmation(booking: any) {
  const result = await sendWhatsAppMessage({
    to: booking.customerPhone,
    templateParams: [
      booking.customerName,
      booking.packageName,
      booking.checkInDate,
      booking.bookingId,
    ],
    campaignName: 'booking_confirmation',
    saveToDb: true,
    tags: ['booking', 'confirmation'],
    attributes: {
      bookingId: booking.id,
      packageId: booking.packageId,
    },
  });

  return result;
}
```

### Payment Receipt

```typescript
async function sendPaymentReceipt(payment: any) {
  const result = await sendWhatsAppMessage({
    to: payment.customerPhone,
    templateParams: [
      payment.customerName,
      payment.amount,
      payment.invoiceNumber,
      payment.date,
    ],
    campaignName: 'payment_receipt',
    saveToDb: true,
  });

  return result;
}
```

## Support & Resources

- [Meta WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Facebook Developers Console](https://developers.facebook.com/)
- [WhatsApp Business Manager](https://business.facebook.com/wa/manage/)

## Updates & Changelog

### Version 1.0.0 (October 2025)
- ✅ Initial Meta WhatsApp Business API integration
- ✅ Automatic provider selection (Meta/AiSensy)
- ✅ Template message support
- ✅ Text message support
- ✅ Database logging
- ✅ Error handling
- ✅ Backward compatibility with existing APIs
