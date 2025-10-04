# Meta WhatsApp Business API - Complete Implementation Guide

## 🎯 Overview

This is a **clean, production-ready** implementation of Meta WhatsApp Business API with **zero AiSensy dependencies**. The implementation is streamlined, well-documented, and follows TypeScript best practices.

## 📋 Table of Contents

1. [Architecture](#architecture)
2. [Environment Setup](#environment-setup)
3. [Core Library](#core-library)
4. [API Endpoints](#api-endpoints)
5. [Usage Examples](#usage-examples)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Your Application                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ API Routes   │  │ React Pages  │  │ Server       │      │
│  │ /api/whatsapp│  │              │  │ Actions      │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │              │
│         └─────────────────┴─────────────────┘              │
│                           │                                │
│                  ┌────────▼────────┐                       │
│                  │  whatsapp.ts    │                       │
│                  │  Core Library   │                       │
│                  └────────┬────────┘                       │
│                           │                                │
│         ┌─────────────────┴─────────────────┐             │
│         │                                   │             │
│    ┌────▼─────┐                      ┌─────▼──────┐      │
│    │ Meta     │                      │  Prisma    │      │
│    │ Graph API│                      │  Database  │      │
│    └──────────┘                      └────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Request** → API Route receives request
2. **Validation** → Parameters validated
3. **Processing** → `sendWhatsAppMessage()` called
4. **API Call** → Meta Graph API request
5. **Database** → Message saved to Prisma
6. **Response** → Result returned to caller

## 🔧 Environment Setup

### Required Variables

Add to `.env.local`:

```bash
# Meta WhatsApp Business API
META_WHATSAPP_PHONE_NUMBER_ID=131371496722301
META_WHATSAPP_ACCESS_TOKEN=EAAVramqNmOUBPo4KSL9HjZBpFEo4pQO2MZCtG4bHpy4D0E1O7Ru2ks0yI0eZCJWIc72umrkifDMnjHuJuMJjcWSzwUXYsMJph1XQrlsq8wic7ZAfYD6gYmVuGPEeEMQZCxVAjUuEfxYzQnR1qiyDZAbfTctnd3PvLEK1HpMVfV8ZBCkFNf9ekVIJR3IwNQeu3YYoIyFs8ZA8yDyKnZBWdhI9fvWpfH4uHwjYjT3aclSBxvPoENaUZD
```

### Optional Variables

```bash
# API Version (defaults to v22.0)
META_GRAPH_API_VERSION=v22.0

# Debug mode
WHATSAPP_DEBUG=1
```

## 📚 Core Library

The core library (`src/lib/whatsapp.ts`) provides these functions:

### Main Functions

#### `sendWhatsAppMessage(params)`
Primary function for sending any type of WhatsApp message.

**Parameters:**
- `to` (string, required): Phone number in E.164 format
- `message` (string, optional): Text message content
- `templateName` (string, optional): Template name for template messages
- `templateParams` (array, optional): Template parameter values
- `templateLanguage` (string, optional): Language code (default: 'en_US')
- `saveToDb` (boolean, optional): Save to database (default: true)
- `media` (object, optional): Media attachment
- `location` (object, optional): Location data

**Returns:**
```typescript
{
  success: boolean;
  messageId?: string;
  error?: string;
  dbRecord?: any;
  rawResponse?: any;
}
```

#### `sendTemplateMessage(to, templateName, params, languageCode)`
Convenience function for sending template messages.

#### `sendTextMessage(to, message)`
Convenience function for sending text messages.

#### `sendMediaMessage(to, type, url, caption, filename)`
Convenience function for sending media messages.

### Database Functions

#### `getWhatsAppMessages(limit)`
Get recent messages from database.

#### `getMessagesForRecipient(phoneNumber, limit)`
Get messages for specific recipient.

#### `updateMessageStatus(messageId, status)`
Update message status (for webhooks).

#### `getMessageStats()`
Get message statistics (total, sent, failed, delivered).

### Configuration Functions

#### `isWhatsAppConfigured()`
Check if WhatsApp is properly configured.

#### `getConfigurationStatus()`
Get configuration status details.

## 🌐 API Endpoints

### POST `/api/whatsapp/send`

Send a WhatsApp message.

**Request Body:**
```json
{
  "to": "+919978783238",
  "message": "Hello!",
  "templateName": "hello_world",
  "templateParams": [],
  "saveToDb": true
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "wamid.HBgLOTE5OTc4NzgzMjM4FQIAERgSNjM0RjMyODQxREE3Q0I0MUJBAA==",
  "status": "Message sent successfully",
  "dbRecord": { ... }
}
```

### GET `/api/whatsapp/messages`

Get recent messages.

**Query Parameters:**
- `limit` (number, optional): Number of messages (default: 50)

**Response:**
```json
{
  "success": true,
  "messages": [ ... ],
  "count": 10
}
```

### GET `/api/whatsapp/config`

Get WhatsApp configuration status.

**Response:**
```json
{
  "isConfigured": true,
  "phoneNumberId": "131371496722301",
  "hasAccessToken": true,
  "apiVersion": "v22.0"
}
```

### POST `/api/whatsapp/webhook`

Handle Meta webhook events (for message status updates).

## 💻 Usage Examples

### Example 1: Send Template Message

```typescript
import { sendWhatsAppMessage } from '@/lib/whatsapp';

// Simple template (no parameters)
const result = await sendWhatsAppMessage({
  to: '+919978783238',
  templateName: 'hello_world',
});

console.log(result.messageId); // wamid.xxx...
```

### Example 2: Send Template with Parameters

```typescript
// Booking confirmation template
const result = await sendWhatsAppMessage({
  to: '+919978783238',
  templateName: 'booking_confirmation',
  templateParams: [
    'John Doe',          // {{1}} - Customer name
    'December 25, 2024', // {{2}} - Date
    'BK123456',          // {{3}} - Booking ID
  ],
});
```

### Example 3: Send Text Message

```typescript
const result = await sendWhatsAppMessage({
  to: '+919978783238',
  message: 'Your payment of $100 has been received. Thank you!',
});
```

### Example 4: Send Media Message

```typescript
const result = await sendWhatsAppMessage({
  to: '+919978783238',
  media: {
    type: 'image',
    url: 'https://example.com/invoice.jpg',
    caption: 'Your invoice for booking #BK123',
  },
});
```

### Example 5: Booking Confirmation (Real-world)

```typescript
import { sendWhatsAppMessage } from '@/lib/whatsapp';

async function sendBookingConfirmation(booking: any) {
  try {
    const result = await sendWhatsAppMessage({
      to: booking.customer.phone,
      templateName: 'booking_confirmation',
      templateParams: [
        booking.customer.name,
        booking.destination,
        booking.checkInDate,
        booking.checkOutDate,
        booking.id,
      ],
      metadata: {
        bookingId: booking.id,
        customerId: booking.customerId,
      },
    });

    if (result.success) {
      console.log(`✅ Confirmation sent to ${booking.customer.name}`);
      console.log(`Message ID: ${result.messageId}`);
      
      // Update booking status
      await prisma.booking.update({
        where: { id: booking.id },
        data: { confirmationSent: true },
      });
    } else {
      console.error(`❌ Failed to send confirmation: ${result.error}`);
    }

    return result;
  } catch (error) {
    console.error('Error in sendBookingConfirmation:', error);
    throw error;
  }
}
```

### Example 6: Payment Receipt

```typescript
async function sendPaymentReceipt(payment: any) {
  const result = await sendWhatsAppMessage({
    to: payment.customer.phone,
    templateName: 'payment_receipt',
    templateParams: [
      payment.customer.name,
      payment.amount.toFixed(2),
      payment.currency,
      payment.invoiceNumber,
      new Date().toLocaleDateString(),
    ],
  });

  return result;
}
```

### Example 7: API Route Usage

```typescript
// pages/api/bookings/confirm.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function POST(request: NextRequest) {
  const { bookingId } = await request.json();
  
  // Get booking details
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true },
  });

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  // Send WhatsApp confirmation
  const whatsappResult = await sendWhatsAppMessage({
    to: booking.customer.phone,
    templateName: 'booking_confirmation',
    templateParams: [
      booking.customer.name,
      booking.packageName,
      booking.checkInDate,
    ],
  });

  return NextResponse.json({
    success: true,
    booking,
    whatsapp: whatsappResult,
  });
}
```

## 🧪 Testing

### Test Script 1: Direct API Test

```powershell
node scripts/whatsapp/send-meta-direct.js 919978783238 hello_world
```

### Test Script 2: Comprehensive Test

```powershell
node scripts/whatsapp/test-meta-whatsapp.js
```

### Test Script 3: Via API

```powershell
# Start server
npm run dev

# Send test message
curl -X POST http://localhost:3000/api/whatsapp/send `
  -H "Content-Type: application/json" `
  -d '{\"to\": \"+919978783238\", \"templateName\": \"hello_world\"}'
```

### Unit Test Example

```typescript
// __tests__/whatsapp.test.ts
import { sendWhatsAppMessage } from '@/lib/whatsapp';

describe('WhatsApp Integration', () => {
  it('should send template message successfully', async () => {
    const result = await sendWhatsAppMessage({
      to: '+919978783238',
      templateName: 'hello_world',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it('should handle errors gracefully', async () => {
    const result = await sendWhatsAppMessage({
      to: 'invalid',
      templateName: 'hello_world',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

## 🚀 Deployment

### Production Checklist

- [ ] Environment variables configured
- [ ] Access token is permanent (System User)
- [ ] Templates approved in Meta Business Manager
- [ ] Database migrations run
- [ ] Webhook configured (optional)
- [ ] Error monitoring setup
- [ ] Rate limiting configured

### Environment Variables for Production

Use System User tokens for production (they don't expire):

1. Go to Meta Business Manager
2. Create System User
3. Assign to WhatsApp Business App
4. Generate permanent token with `whatsapp_business_messaging` permission
5. Add to production environment

### Security Best Practices

1. **Never commit tokens** to git
2. **Use environment variables** for all credentials
3. **Rotate tokens** periodically
4. **Monitor usage** for unusual activity
5. **Implement rate limiting** to prevent abuse
6. **Validate phone numbers** before sending
7. **Log all messages** for audit trail

## 🐛 Troubleshooting

### Common Issues

#### "META_WHATSAPP_PHONE_NUMBER_ID is not configured"

**Solution:**
- Check `.env.local` file exists
- Verify variable name is correct
- Restart Next.js server

#### "Template not found"

**Solution:**
- Verify template is approved in Meta Business Manager
- Check template name (case-sensitive)
- Ensure using correct WhatsApp Business Account

#### "Invalid OAuth access token"

**Solution:**
- Generate new permanent token
- Verify token has correct permissions
- Check token hasn't been revoked

#### "Message sent but not received"

**Solution:**
- Verify recipient has WhatsApp installed
- Check phone number is added to test numbers (for testing)
- Wait a few minutes (can have delays)
- Check Meta Business Manager for delivery status

### Debug Mode

Enable debug logging:

```bash
WHATSAPP_DEBUG=1
```

This will log:
- API requests and responses
- Phone number normalization
- Template parameter processing
- Error details

### Checking Message Status

```typescript
import { getMessageById } from '@/lib/whatsapp';

const message = await getMessageById('wamid.xxx...');
console.log(message.status); // 'sent', 'delivered', 'read', 'failed'
```

## 📊 Monitoring & Analytics

### Message Statistics

```typescript
import { getMessageStats } from '@/lib/whatsapp';

const stats = await getMessageStats();
console.log(stats);
// {
//   total: 150,
//   sent: 120,
//   failed: 5,
//   delivered: 115,
//   successRate: '95.00'
// }
```

### Recent Messages

```typescript
import { getWhatsAppMessages } from '@/lib/whatsapp';

const recentMessages = await getWhatsAppMessages(10);
recentMessages.forEach(msg => {
  console.log(`${msg.to}: ${msg.status} - ${msg.message}`);
});
```

## 🔗 Resources

- [Meta WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Message Templates Guide](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates)
- [Error Codes Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes)
- [Webhooks Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)

## 📝 Notes

### Template Creation

Create templates in Meta Business Manager:
1. Go to WhatsApp Manager
2. Click "Message Templates"
3. Create new template
4. Wait for approval (usually 15 minutes to 24 hours)
5. Use approved template name in code

### Phone Number Format

Always use E.164 format:
- ✅ `+919978783238`
- ✅ `919978783238` (automatically converted)
- ❌ `9978783238` (missing country code)
- ❌ `+91-99787-83238` (contains dashes)

### Rate Limits

Meta WhatsApp has rate limits:
- **Tier 1**: 1,000 business-initiated conversations/day
- **Tier 2**: 10,000 business-initiated conversations/day
- **Tier 3**: 100,000 business-initiated conversations/day

Quality rating affects tier progression.

---

**Implementation Date:** October 4, 2025  
**Status:** ✅ Production Ready  
**Version:** 2.0.0 (Meta Only - AiSensy Removed)
