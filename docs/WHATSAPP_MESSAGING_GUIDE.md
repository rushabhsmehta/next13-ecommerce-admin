# WhatsApp Messaging Guide

## Overview

This guide explains how to send messages to customers via WhatsApp, including free-form messages within the 24-hour window and template messages.

## 24-Hour Messaging Window

### What is it?

Meta WhatsApp Business API enforces a **24-hour customer service window**:

- ✅ **Within 24 hours**: You can send any free-form text message to customers
- ❌ **After 24 hours**: You must use an approved template message

The 24-hour window starts when a customer sends you a message.

### How it works

```
Customer sends message → 24-hour window opens
├─ Hour 0-24: Send free-form messages ✅
└─ Hour 24+: Must use templates ❌
```

## Sending Messages

### Option 1: Using the API Endpoint (Recommended)

The API automatically checks the 24-hour window and handles errors.

**Check if you can message a customer:**

```bash
# GET request
curl "http://localhost:3000/api/whatsapp/send-message?to=+919978783238"
```

**Send a message:**

```bash
# POST request
curl -X POST http://localhost:3000/api/whatsapp/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+919978783238",
    "message": "Thank you for your interest! Our team will contact you shortly.",
    "checkWindow": true
  }'
```

**Response (Success):**

```json
{
  "success": true,
  "messageId": "wamid.HBgMOTE5OTc4NzgzMjM4FQIAERgSQzE3N0IyMTEyMzA0OEMzMzlGAA==",
  "databaseId": "clxy123...",
  "to": "+919978783238",
  "message": "Thank you for your interest!"
}
```

**Response (Window Expired):**

```json
{
  "error": "Cannot send message - customer has not messaged you recently",
  "details": "Messages can only be sent within 24 hours of the customer's last message. Use a template message instead.",
  "canMessage": false,
  "requiresTemplate": true
}
```

### Option 2: Using Scripts

**Check messaging window:**

```bash
node scripts/whatsapp/check-messaging-window.js +919978783238
```

Output:
```
🔍 Checking messaging window for +919978783238...

📊 Status:
   Can Message: ✅ YES
   Time Remaining: 18.3 hours
   Expires: 10/12/2025, 2:45 PM

📬 Last Inbound Message:
   Time: 10/11/2025, 8:27 PM
   Message: Hello, I'm interested in your tour packages

💡 Recommendation: You can send free-form messages
```

**Send a free-form message:**

```bash
node scripts/whatsapp/send-text-message.js +919978783238 "Thank you for your message!"
```

**Send a template message (for expired windows):**

```bash
node scripts/whatsapp/send-welcome-template.js +919978783238
```

## API Reference

### `POST /api/whatsapp/send-message`

Send a free-form text message with automatic 24-hour window validation.

**Request Body:**

```typescript
{
  to: string;           // Phone number with country code (e.g., "+919978783238")
  message: string;      // Message text to send
  checkWindow?: boolean; // Check 24-hour window (default: true)
}
```

**Response (200 OK):**

```typescript
{
  success: true;
  messageId: string;     // WhatsApp message ID
  databaseId: string;    // Database record ID
  to: string;           // Recipient phone number
  message: string;      // Message sent
}
```

**Response (403 Forbidden - Window Expired):**

```typescript
{
  error: string;
  details: string;
  canMessage: false;
  requiresTemplate: true;
}
```

**Response (400 Bad Request):**

```typescript
{
  error: string;
  details?: string;
}
```

### `GET /api/whatsapp/send-message?to={phoneNumber}`

Check if you can send messages to a phone number.

**Query Parameters:**

- `to` (required): Phone number with country code

**Response:**

```typescript
{
  phoneNumber: string;
  canMessage: boolean;        // true if within 24-hour window
  hoursRemaining?: number;    // Hours left in the window
  lastInboundMessage?: {
    id: string;
    message: string;
    createdAt: string;
  };
  recommendation: string;     // What you should do
}
```

## Database Schema

### WhatsAppMessage

Stores all sent and received messages.

```prisma
model WhatsAppMessage {
  id          String   @id @default(cuid())
  message     String?
  status      String?  // 'sent', 'delivered', 'read', 'failed'
  direction   String?  // 'inbound' or 'outbound'
  from        String?  // Sender (format: whatsapp:919978783238)
  to          String?  // Recipient
  messageSid  String?  // WhatsApp message ID
  metadata    Json?    // Additional message data
  payload     Json?    // Original API payload
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([to])
  @@index([direction])
  @@index([createdAt])
}
```

### How Messages are Tracked

1. **Inbound Messages** (Customer → You):
   - Webhook receives message
   - Saved with `direction: 'inbound'`
   - `createdAt` timestamp marks start of 24-hour window

2. **Outbound Messages** (You → Customer):
   - API sends message
   - Saved with `direction: 'outbound'`
   - `status` tracks delivery: sent → delivered → read

## Error Handling

### Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 131026 | Message Undeliverable | Customer hasn't messaged you in 24 hours. Use a template. |
| 131047 | Re-engagement Required | 24-hour window expired. Send an approved template. |
| 100 | Invalid Parameter | Check phone number format and message content. |
| 131051 | Unsupported Message Type | Use text messages or check message format. |

### Handling Window Expiration

When the 24-hour window expires:

```javascript
// Check window before sending
const response = await fetch('/api/whatsapp/send-message?to=+919978783238');
const status = await response.json();

if (!status.canMessage) {
  // Window expired - send template instead
  console.log('24-hour window expired. Sending template...');
  // Use template API instead
} else {
  // Send free-form message
  console.log(`${status.hoursRemaining} hours remaining`);
}
```

## Best Practices

### 1. Always Check the Window First

```javascript
// ✅ GOOD: Check first
const canMessage = await checkMessagingWindow(phoneNumber);
if (canMessage) {
  await sendFreeFormMessage(phoneNumber, message);
} else {
  await sendTemplateMessage(phoneNumber);
}

// ❌ BAD: Send blindly and handle errors
try {
  await sendFreeFormMessage(phoneNumber, message);
} catch (error) {
  if (error.code === 131047) {
    await sendTemplateMessage(phoneNumber);
  }
}
```

### 2. Track Time Remaining

Display time remaining to users:

```javascript
const status = await fetch(`/api/whatsapp/send-message?to=${phone}`);
const data = await status.json();

if (data.hoursRemaining) {
  console.log(`⏰ ${data.hoursRemaining.toFixed(1)} hours remaining`);
  // Show countdown in UI
}
```

### 3. Fallback to Templates

Always have template messages ready:

```javascript
async function sendMessage(to, message) {
  const response = await fetch('/api/whatsapp/send-message', {
    method: 'POST',
    body: JSON.stringify({ to, message }),
  });

  if (!response.ok) {
    const error = await response.json();
    
    if (error.requiresTemplate) {
      // Automatically fallback to template
      return sendTemplateMessage(to);
    }
  }
}
```

### 4. Log All Messages

All messages are automatically logged to the database:

```sql
-- View recent conversations
SELECT 
  from, 
  to, 
  message, 
  direction, 
  status, 
  createdAt
FROM "WhatsAppMessage"
WHERE to = 'whatsapp:919978783238' 
   OR from = 'whatsapp:919978783238'
ORDER BY createdAt DESC
LIMIT 20;
```

## Testing

### Test the 24-Hour Window

1. **Have customer send you a message**:
   ```
   Customer sends: "Hello, I'm interested in your tours"
   ```

2. **Check window status**:
   ```bash
   node scripts/whatsapp/check-messaging-window.js +919978783238
   # Should show: Can Message: ✅ YES
   ```

3. **Send free-form message**:
   ```bash
   node scripts/whatsapp/send-text-message.js +919978783238 "Thank you! We'll contact you soon."
   # Should succeed
   ```

4. **Wait 24+ hours and try again**:
   ```bash
   node scripts/whatsapp/send-text-message.js +919978783238 "Follow up"
   # Should fail with error code 131047
   ```

5. **Send template instead**:
   ```bash
   node scripts/whatsapp/send-welcome-template.js +919978783238
   # Should succeed
   ```

## Troubleshooting

### "Message not reaching customer"

**Problem**: You send a message but customer doesn't receive it.

**Possible Causes**:

1. **24-hour window expired**
   - Solution: Check window status first
   - Use template message instead

2. **Wrong phone number format**
   - ✅ Correct: `+919978783238` or `919978783238`
   - ❌ Wrong: `09978783238`, `9978783238`

3. **Customer blocked your number**
   - Check WhatsApp Business Manager for delivery status

4. **Network/API issues**
   - Check response for error messages
   - Verify access token is valid

### Debugging

Enable detailed logging:

```javascript
// In your API route
console.log('📤 Sending to:', phoneNumber);
console.log('⏰ Window check:', windowStatus);
console.log('📦 Payload:', messagePayload);
```

Check database for message records:

```bash
# Using Prisma Studio
npx prisma studio

# Navigate to WhatsAppMessage table
# Filter by 'to' or 'from' phone number
```

## Integration with Admin Dashboard

### Display Conversation History

```typescript
// Fetch messages for a customer
const messages = await prisma.whatsAppMessage.findMany({
  where: {
    OR: [
      { to: `whatsapp:${phoneNumber}` },
      { from: `whatsapp:${phoneNumber}` },
    ],
  },
  orderBy: { createdAt: 'asc' },
});
```

### Show Window Status

```typescript
// Check if customer can receive free-form messages
const canMessage = await fetch(
  `/api/whatsapp/send-message?to=${phoneNumber}`
);
const status = await canMessage.json();

// Display in UI
{status.canMessage ? (
  <Badge variant="success">
    Active - {status.hoursRemaining?.toFixed(1)}h remaining
  </Badge>
) : (
  <Badge variant="warning">
    Expired - Use Template
  </Badge>
)}
```

## See Also

- [WhatsApp Business Platform Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api/)
- [Message Templates Guide](./QUICK_SETUP_META_WHATSAPP.md)
- [Webhook Setup](./WEBHOOK_SETUP_GUIDE.md)
- [Flow Integration](./META_WHATSAPP_INTEGRATION.md)
