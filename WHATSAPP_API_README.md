# WhatsApp Business API Integration

This project now includes WhatsApp Business messaging functionality using Twilio's WhatsApp API.

## Setup

### Environment Variables

Make sure your `.env` file contains the following WhatsApp-related variables:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACXXXXX...
TWILIO_AUTH_TOKEN=REDACTED
TWILIO_WHATSAPP_NUMBER=whatsapp:+919898744701

# WhatsApp Business API (Optional - for Meta's API)
WHATSAPP_ACCESS_TOKEN=REDACTED
WHATSAPP_BUSINESS_ACCOUNT_ID=YOUR_WABA_ACCOUNT_ID
WHATSAPP_PHONE_NUMBER_ID=YOUR_PHONE_NUMBER_ID
```

## API Endpoints

### Send WhatsApp Message
**POST** `/api/whatsapp/send`

Send a WhatsApp message to a recipient.

**Request Body:**
```json
{
  "to": "+1234567890",
  "message": "Hello from WhatsApp Business!",
  "saveToDb": true
}
```

**Response:**
```json
{
  "success": true,
  "messageSid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "status": "Message sent successfully",
  "dbRecord": { ... }
}
```

### Send Template Message
**POST** `/api/whatsapp/send-template`

Send a WhatsApp message using a predefined template.

**Request Body:**
```json
{
  "to": "+1234567890",
  "templateId": "template-uuid-here",
  "variables": {
    "name": "John Doe",
    "company": "Your Company"
  },
  "saveToDb": true
}
```

**Response:**
```json
{
  "success": true,
  "messageSid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "status": "Template message sent successfully",
  "template": "Welcome Message",
  "processedMessage": "Hello John Doe! Welcome to Your Company...",
  "dbRecord": { ... }
}
```

### Get WhatsApp Templates
**GET** `/api/whatsapp/templates`

Retrieve all available message templates.

**Response:**
```json
{
  "success": true,
  "templates": [
    {
      "id": "uuid",
      "name": "Welcome Message",
      "body": "Hello {{name}}! Welcome to {{company}}.",
      "variables": ["name", "company"],
      "createdAt": "2025-08-31T...",
      "updatedAt": "2025-08-31T..."
    }
  ],
  "count": 6
}
```

### Create WhatsApp Template
**POST** `/api/whatsapp/templates`

Create a new message template.

**Request Body:**
```json
{
  "name": "New Template",
  "body": "Hello {{name}}, your order {{orderNumber}} is ready!",
  "variables": ["name", "orderNumber"]
}
```

### Get WhatsApp Messages
**GET** `/api/whatsapp/messages?limit=50`

Retrieve recent WhatsApp messages from the database.

**Response:**
```json
{
  "success": true,
  "messages": [...],
  "count": 10
}
```

### WhatsApp Webhook
**POST** `/api/whatsapp/webhook`

Handles status updates from Twilio (message delivered, failed, etc.).

## Usage Examples

### Using Template Messages

```typescript
import { sendWhatsAppMessage } from '@/lib/whatsapp';

// Send a template message via API
const response = await fetch('/api/whatsapp/send-template', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: '+1234567890',
    templateId: 'template-uuid-here',
    variables: {
      name: 'John Doe',
      company: 'Your Company',
      orderNumber: '12345'
    }
  })
});

// Get all templates
const templatesResponse = await fetch('/api/whatsapp/templates');
const { templates } = await templatesResponse.json();
```

### Using the WhatsApp Utility Function

```typescript
import { sendWhatsAppMessage } from '@/lib/whatsapp';

// Send a message
const result = await sendWhatsAppMessage({
  to: '+1234567890',
  message: 'Hello from your app!',
  saveToDb: true
});

if (result.success) {
  console.log('Message sent:', result.messageSid);
} else {
  console.error('Failed to send:', result.error);
}
```

### Using Fetch API

```javascript
// Send a message
const response = await fetch('/api/whatsapp/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: '+1234567890',
    message: 'Test message'
  }),
});

const result = await response.json();
```

## Database Schema

The `WhatsAppMessage` model stores message data:

```prisma
model WhatsAppMessage {
  id            String   @id @default(uuid())
  to            String?  // Recipient phone number
  from          String?  // Sender WhatsApp number
  message       String?  @db.Text
  messageSid    String?  // Twilio message SID
  status        String   @default("pending")
  direction     String   @default("outbound")
  errorCode     String?
  errorMessage  String?  @db.Text
  sentAt        DateTime?
  deliveredAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model WhatsAppTemplate {
  id        String   @id @default(uuid())
  name      String   @unique
  body      String   @db.Text
  variables Json?    // Array of variable names as JSON
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Default Templates

The system comes with 6 pre-configured templates:

1. **Welcome Message**: `Hello {{name}}! Welcome to {{company}}.`
2. **Order Confirmation**: `Hi {{name}}, your order #{{orderNumber}} has been confirmed...`
3. **Tour Package Inquiry**: `Hello {{name}}, thank you for your interest in our {{packageName}} tour...`
4. **Payment Reminder**: `Dear {{name}}, this is a reminder that your payment of {{amount}}...`
5. **Meeting Reminder**: `Hi {{name}}, reminder about our meeting on {{date}} at {{time}}...`
6. **Custom Promotion**: `Special offer for {{name}}! Get {{discount}}% off on {{product}}...`

## Testing

### Web Interface
Visit `/settings/whatsapp` in your application to:
- Send test messages
- View recent messages
- Check configuration status

### API Testing
Run the test script:
```bash
node test-whatsapp.js
```

### Manual Testing
Use tools like Postman or curl:

```bash
curl -X POST http://localhost:3000/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "message": "Test message"
  }'
```

## Twilio Configuration

1. **WhatsApp Number Setup:**
   - Go to [Twilio Console](https://console.twilio.com)
   - Navigate to Messaging > WhatsApp
   - Enable WhatsApp and get your WhatsApp number

2. **Webhook Configuration:**
   - In Twilio Console, set the webhook URL to:
     ```
     https://admin.aagamholidays.com/api/whatsapp/webhook
     ```
   - This receives status updates for sent messages

## Phone Number Format

- Always include country code: `+1` for US, `+91` for India, etc.
- Example: `+919898744701` for an Indian number
- The API automatically handles the `whatsapp:` prefix

## Error Handling

The API includes comprehensive error handling:
- Invalid phone numbers
- Missing Twilio configuration
- Network errors
- Twilio API errors

All errors are logged and can be saved to the database for debugging.

## Security Notes

- Never expose Twilio credentials in client-side code
- Use environment variables for all sensitive data
- Validate phone numbers before sending
- Implement rate limiting for production use

## Troubleshooting

1. **Messages not sending:**
   - Check Twilio credentials in `.env`
   - Verify WhatsApp number is enabled in Twilio
   - Check Twilio account balance

2. **Webhook not receiving updates:**
   - Ensure webhook URL is correctly set in Twilio Console
   - Check server logs for webhook requests

3. **Database errors:**
   - Run `npx prisma migrate dev` if schema changes
   - Check database connection in `.env`
