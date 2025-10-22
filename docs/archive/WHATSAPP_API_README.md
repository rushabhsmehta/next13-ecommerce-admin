# WhatsApp Business API Integration

## Overview
- Primary provider: **AiSensy Campaign API**
- WhatsApp Cloud API and Twilio integrations have been fully removed.

The admin UI under `/settings/whatsapp` automatically reflects whichever provider is active and exposes recent message history, template previews, and diagnostics.

## Environment variables

### Required (AiSensy)
```
AISENSY_API_KEY=your-long-api-key
AISENSY_DEFAULT_CAMPAIGN_NAME=My Live API Campaign
```

### Optional AiSensy helpers
```
AISENSY_DEFAULT_SOURCE=Website lead          # stored against the AiSensy contact
AISENSY_DEFAULT_TAGS=lead,automation         # comma-separated; merged with per-request tags
AISENSY_DEFAULT_USERNAME=Aagam Holidays      # default "userName" sent to AiSensy
AISENSY_SENDER_ID=whatsapp:+919724444701     # used when recording the sender in Prisma
AISENSY_API_BASE=https://backend.aisensy.com # override only if AiSensy support instructs you to
```

> **Critical:** `AISENSY_DEFAULT_CAMPAIGN_NAME` must match the **live API campaign** created inside AiSensy. That campaign already points to a pre-approved WhatsApp template. The backend simply injects your dynamic values through `templateParams` and sends everything through AiSensy.

## REST endpoints

### `POST /api/whatsapp/send`
Send a message through the active provider (AiSensy by default).

Request body:
```
{
  "to": "+1234567890",                // E.164
  "message": "Hello from WhatsApp!",   // optional when templateParams provided
  "campaignName": "My Live API Campaign", // optional, overrides AISENSY_DEFAULT_CAMPAIGN_NAME
  "templateParams": ["John", "Invoice #123"], // optional array; defaults to [message]
  "userName": "John Doe",              // optional contact display name
  "source": "CRM",                     // optional source channel
  "tags": ["renewal"],                 // optional array, merged with AISENSY_DEFAULT_TAGS
  "attributes": { "city": "Surat" },  // optional string map stored in AiSensy
  "saveToDb": true                      // defaults to true
}
```

Response:
```
{
  "success": true,
  "messageSid": "4c932942-8b3e-4a4a-9d0f...", // AiSensy request id (or Meta message id)
  "status": "Message sent successfully",
  "provider": "aisensy",
  "dbRecord": { ... }                       // Prisma WhatsAppMessage row
}
```

### `POST /api/whatsapp/send-template`
Triggers either:
- AiSensy campaign (when `campaignName`/`templateName` matches a live AiSensy API campaign)
- Local template rendering (fallback, typically for legacy Meta usage)

Key request arguments:
```
{
  "to": "+1234567890",
  "templateId": "template-uuid-here",       // local DB template id OR campaign name
  "templateName": "booking_confirmation",   // optional explicit AiSensy campaign/template name
  "variables": { "1": "John", "2": "24 Aug" },
  "campaignName": "booking_confirmation",   // optional override
  "userName": "John Doe",                   // optional
  "source": "Sales",
  "tags": ["tour"],
  "attributes": { "package": "Himalaya" },
  "saveToDb": true
}
```
`variables` can be either an object keyed by placeholder index/name or an array. Internally, body parameters are serialised in order and forwarded as AiSensy `templateParams`.

### `GET /api/whatsapp/templates`
Lists templates available to the UI. Returns Prisma-managed templates only.

### `POST /api/whatsapp/templates`
Creates a Prisma-managed plain-text template for the fallback path.

### `GET /api/whatsapp/messages?limit=50`
Returns recent `WhatsAppMessage` rows recorded in Prisma.

### `GET /api/whatsapp/config`
Returns a summary of the active provider and key configuration flags displayed in the settings UI.

### `POST /api/whatsapp/webhook`
Legacy WhatsApp Cloud webhook endpoint. It now returns `410 Gone` to signal that Cloud-based inbound traffic is no longer supported.

## Usage snippets

```ts
import { sendWhatsAppMessage } from '@/lib/whatsapp';

await sendWhatsAppMessage({
  to: '+917000000000',
  message: 'Payment received! Thank you ❤️',
  tags: ['payment'],
  attributes: { invoice: 'INV-2024-001' }
});
```

```ts
await fetch('/api/whatsapp/send-template', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: '+441234567890',
    templateName: 'booking_confirmation',
    variables: { 1: 'Alex', 2: '15 Sep' },
    tags: ['uk-market']
  })
});
```

## Data model snapshot

```
model WhatsAppMessage {
  id            String   @id @default(uuid())
  to            String?
  from          String?
  message       String?  @db.Text
  messageSid    String?
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

## AiSensy-specific notes
1. **Campaign must be live** – AiSensy rejects requests sent to campaigns that are in draft or paused state.
2. **Template parameters** – the array length must match the template bound to the campaign. The backend will send `templateParams` in the order supplied.
3. **Contacts** – AiSensy automatically creates/updates contacts. Optional `userName`, `source`, `tags`, and `attributes` from the request (plus defaults from environment variables) are persisted against that contact.
4. **Media** – set `media.url` (and optional `media.filename`) when calling `sendWhatsAppMessage`. The URL has to be publicly accessible.

## Provider behaviour
- All outbound messaging flows through AiSensy. Missing or invalid AiSensy credentials will surface as errors to the caller.
- Diagnostics in the settings UI are tailored for AiSensy; Cloud-specific checks are removed.

## Phone number hygiene
- Always use E.164 format (leading `+` and country code).
- If users submit local numbers, normalise them before invoking the API or provide a sensible default country code on the server.

## Error handling & troubleshooting
- The server saves failed sends to Prisma with `status = 'failed'` and the provider error message.
- Common AiSensy failures: invalid campaign name, inactive template, mismatched `templateParams`, or non-public media URLs.
- Enable `WHATSAPP_DEBUG=1` to include raw provider responses in API responses (useful during debugging only).
- Use AiSensy dashboard logs for delivery analytics and webhook-equivalent status tracking.

## Security reminders
- Keep API keys in environment variables—never expose them in client code.
- Rate-limit automations that trigger WhatsApp sends to avoid spamming contacts.
- Audit Prisma logs regularly to monitor failed deliveries or integration errors.
