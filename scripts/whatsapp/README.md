# WhatsApp Scripts

# WhatsApp Scripts

Collection of utility scripts for WhatsApp integration testing and management.

## 📁 Available Scripts

### Campaign Management

#### `test-campaign-api.js`
Test the campaign management API endpoints.

**Usage:**
```bash
node scripts/whatsapp/test-campaign-api.js
```

**What it tests:**
1. Create campaign
2. Fetch campaign details
3. List all campaigns
4. Add recipients
5. Get recipients list
6. Get campaign stats
7. Send campaign (commented out for safety)

**Output:**
```
🧪 Testing WhatsApp Campaign API

1️⃣  Creating campaign...
✅ Campaign created: { id: '...', name: '...', status: 'draft' }

2️⃣  Fetching campaign details...
✅ Campaign details: { ... }

...
```

### Message Testing

#### `send-text-message.js`
Send a test text message to verify WhatsApp connection.

**Usage:**
```bash
node scripts/whatsapp/send-text-message.js +919978783238 "Hello, World!"
```

**Parameters:**
- `phoneNumber` - E.164 format (e.g., +919978783238)
- `message` - Text message to send

#### `check-messaging-window.js`
Check if a phone number is within the 24-hour messaging window.

**Usage:**
```bash
node scripts/whatsapp/check-messaging-window.js +919978783238
```

#### `test-window-logic.js`
Run automated tests for 24-hour window validation logic.

**Usage:**
```bash
node scripts/whatsapp/test-window-logic.js
```

**Tests:**
- Never messaged (should require template)
- Within 24 hours (should allow free-form)
- Exactly 24 hours (edge case)
- Over 24 hours (should require template)

### Template Management

#### `check-template-status.js`
Check the status and details of WhatsApp templates.

**Usage:**
```bash
node scripts/whatsapp/check-template-status.js
```

#### `submit-and-send-marketing-welcome.js`
Submit and send the marketing welcome template.

**Usage:**
```bash
node scripts/whatsapp/submit-and-send-marketing-welcome.js
```

### Utilities

#### `convert-key-for-vercel.js`
Convert encryption keys to Base64 format for Vercel environment variables.

**Usage:**
```bash
node scripts/whatsapp/convert-key-for-vercel.js
```

#### `upload-public-key.js`
Upload public encryption key to Meta.

**Usage:**
```bash
node scripts/whatsapp/upload-public-key.js
```

## 🚀 Quick Start

### Test Your Setup

1. **Send a test message:**
```bash
node scripts/whatsapp/send-text-message.js +919978783238 "Test"
```

2. **Create and test a campaign:**
```bash
node scripts/whatsapp/test-campaign-api.js
```

3. **Check template status:**
```bash
node scripts/whatsapp/check-template-status.js
```

## 📝 Script Development

### Creating a New Script

```javascript
// scripts/whatsapp/my-script.js

/**
 * My WhatsApp Script
 * 
 * Description of what this script does
 * 
 * Usage:
 *   node scripts/whatsapp/my-script.js [args]
 */

async function main() {
  try {
    // Your code here
    console.log('✅ Script completed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
```

### Common Patterns

**Sending a Message:**
```javascript
const response = await fetch('http://localhost:3000/api/whatsapp/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: '+919978783238',
    message: 'Hello!'
  })
});
```

**Checking Campaign Status:**
```javascript
const response = await fetch(
  `http://localhost:3000/api/whatsapp/campaigns/${campaignId}`
);
const { campaign } = await response.json();
console.log('Status:', campaign.status);
```

## 🔧 Troubleshooting

### "Connection refused"
- Make sure dev server is running: `npm run dev`
- Check server is on port 3000: `http://localhost:3000`

### "Unauthorized"
- Scripts that hit authenticated endpoints need auth
- Use test script format or add authentication headers

### "Template not found"
- Check template name is correct
- Verify template is approved in Meta Business Manager
- Run `check-template-status.js` to see available templates

## 📚 Additional Resources

- [Campaign API Quick Reference](../../docs/CAMPAIGN_API_QUICK_REFERENCE.md)
- [Campaign Implementation Summary](../../docs/CAMPAIGN_IMPLEMENTATION_SUMMARY.md)
- [WhatsApp Integration Guide](../../docs/WHATSAPP_MESSAGING_GUIDE.md)

---

**Happy testing! 🚀**


## Meta WhatsApp Business API Scripts

### Messaging Scripts

#### `send-text-message.js` ⭐ NEW
Send free-form text messages to customers within the 24-hour messaging window.

**Usage:**
```powershell
node scripts/whatsapp/send-text-message.js +919978783238 "Your message here"
```

**What it does:**
- Sends free-form (non-template) messages to customers
- Works only within 24 hours of customer's last message
- Shows detailed success/error information
- Error code 131047 means window expired - use template instead

**Important:** Can only send to customers who messaged you in the last 24 hours!

#### `check-messaging-window.js` ⭐ NEW
Check if a customer is within the 24-hour messaging window.

**Usage:**
```powershell
node scripts/whatsapp/check-messaging-window.js +919978783238
```

**What it shows:**
- Whether you can send free-form messages (YES/NO)
- Time remaining in the 24-hour window
- When the window expires
- Last message from customer

**Use before sending:** Always check the window status before attempting to send messages!

#### `test-meta-whatsapp.js`
Comprehensive test script for Meta WhatsApp Business API integration.

**Usage:**
```powershell
node scripts/whatsapp/test-meta-whatsapp.js
```

**What it does:**
- Checks environment variable configuration
- Tests direct Meta Graph API calls
- Tests through local API endpoints
- Verifies database logging

#### `send-meta-direct.js`
Direct Meta WhatsApp API message sender (mimics curl command).

**Usage:**
```powershell
# Send to default number with hello_world template
node scripts/whatsapp/send-meta-direct.js

# Send to specific number
node scripts/whatsapp/send-meta-direct.js 919978783238

# Send specific template
node scripts/whatsapp/send-meta-direct.js 919978783238 booking_confirmation
```

**What it does:**
- Sends WhatsApp messages directly via Meta Graph API
- Shows detailed request/response information
- Useful for debugging and testing

### `test-whatsapp.js`
Test WhatsApp API endpoints through the Next.js application.

**Usage:**
```bash
node scripts/whatsapp/test-whatsapp.js
```

### `test-whatsapp-templates.js`
Test WhatsApp template functionality.

**Usage:**
```bash
node scripts/whatsapp/test-whatsapp-templates.js
```

### `test-whatsapp-db.js`
Test WhatsApp database operations.

**Usage:**
```bash
node scripts/whatsapp/test-whatsapp-db.js
```

### `test-window-logic.js` ⭐ NEW
Test the 24-hour messaging window logic.

**Usage:**
```bash
node scripts/whatsapp/test-window-logic.js
```

**What it does:**
- Tests the logic that determines if you can message a customer
- Runs 4 test scenarios (2h, 23h, 25h ago, no messages)
- Validates the 24-hour window calculation
- Great for verifying the system works correctly

## Understanding the 24-Hour Window

Meta WhatsApp enforces a **24-hour customer service window**:

```
Customer sends message → 24-hour window opens
├─ 0-24 hours: ✅ Send free-form messages
└─ 24+ hours: ❌ Must use templates only
```

### Workflow Example

1. **Customer messages you**: "I'm interested in Bali packages"
2. **You have 24 hours** to send any reply (free-form text)
3. **After 24 hours**: Can only send approved template messages
4. **Customer replies again**: New 24-hour window opens

### Quick Reference

| Scenario | Can Send Free-form? | Solution |
|----------|---------------------|----------|
| Customer messaged 2 hours ago | ✅ YES | Use `send-text-message.js` |
| Customer messaged 23 hours ago | ✅ YES | Hurry! Only 1 hour left |
| Customer messaged 25 hours ago | ❌ NO | Use template message |
| Customer never messaged | ❌ NO | Use template to start conversation |

## Environment Configuration

Before running any scripts, ensure you have the required environment variables set in `.env` or `.env.local`:

### Required Variables
```bash
META_WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
META_WHATSAPP_ACCESS_TOKEN=your_access_token
META_GRAPH_API_VERSION=v22.0  # Optional, defaults to v22.0
```

## Quick Start

### 1. Configure Environment Variables
```powershell
# Copy example file
cp .env.meta.example .env.local

# Edit .env.local with your credentials
```

### 2. Test Meta Integration
```powershell
node scripts/whatsapp/test-meta-whatsapp.js
```

### 3. Send a Template Message (Works Anytime)
```powershell
node scripts/whatsapp/send-meta-direct.js 919978783238 hello_world
```

### 4. Reply to a Customer (Within 24 Hours)

**Step 1: Check if you can message them**
```powershell
node scripts/whatsapp/check-messaging-window.js +919978783238
```

**Step 2: If within window, send your reply**
```powershell
node scripts/whatsapp/send-text-message.js +919978783238 "Thank you for your interest! We'll contact you shortly."
```

**Step 3: If window expired, use template**
```powershell
node scripts/whatsapp/send-welcome-template.js +919978783238
```

## Troubleshooting

### "Message not reaching customer"
**Most Common Cause:** 24-hour window expired

**Solution:**
```powershell
# 1. Check window status
node scripts/whatsapp/check-messaging-window.js +919978783238

# 2. If shows "Can Message: NO", use template instead
node scripts/whatsapp/send-welcome-template.js +919978783238
```

### Error Code 131047: "Re-engagement required"
**Meaning:** 24-hour window has expired

**Solution:** Send an approved template message to re-engage the customer

### Error Code 131026: "Message undeliverable"
**Possible Causes:**
1. Customer hasn't messaged you in 24 hours
2. Wrong phone number format
3. Customer blocked your number

**Solution:** 
- Verify phone number format: `+919978783238` or `919978783238`
- Check window status with `check-messaging-window.js`

### "Missing Meta WhatsApp configuration"
- Check your `.env` or `.env.local` file
- Ensure both `META_WHATSAPP_PHONE_NUMBER_ID` and `META_WHATSAPP_ACCESS_TOKEN` are set
- Restart your application after updating environment variables

### "Template not found"
- Verify the template is approved in Meta Business Manager
- Template names are case-sensitive
- Check WhatsApp > Message Templates in Meta dashboard

### "Invalid OAuth access token"
- Token may have expired (temporary tokens expire after 24-72 hours)
- Generate a new permanent token using System User
- Verify token has `whatsapp_business_messaging` permission

## Documentation

For detailed documentation, see:
- **[Quick Reference](../../docs/WHATSAPP_QUICK_REFERENCE.md)** - Quick commands and concepts ⭐ NEW
- **[Messaging Guide](../../docs/WHATSAPP_MESSAGING_GUIDE.md)** - Complete 24-hour window guide ⭐ NEW
- [Meta WhatsApp Implementation Guide](../../docs/WHATSAPP_IMPLEMENTATION_GUIDE.md)
- [Meta WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)

## Support

For issues or questions:
1. Check the logs in your terminal/console
2. Review the documentation files
3. Test with the direct script to isolate issues
4. Check Meta Business Manager for template approvals and account status
