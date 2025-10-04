# WhatsApp Scripts

This directory contains utility scripts for testing and managing WhatsApp integrations using Meta WhatsApp Business API.

## Meta WhatsApp Business API Scripts

### `test-meta-whatsapp.js`
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

### `send-meta-direct.js`
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

## Environment Configuration

Before running any scripts, ensure you have the required environment variables set in `.env` or `.env.local`:

### Required Variables
```bash
META_WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
META_WHATSAPP_ACCESS_TOKEN=your_access_token
META_GRAPH_API_VERSION=v22.0  # Optional, defaults to v22.0
```

## Quick Start

1. **Configure Environment Variables**
   ```powershell
   # Copy example file
   cp .env.meta.example .env.local
   
   # Edit .env.local with your credentials
   ```

2. **Test Meta Integration**
   ```powershell
   node scripts/whatsapp/test-meta-whatsapp.js
   ```

3. **Send Test Message**
   ```powershell
   node scripts/whatsapp/send-meta-direct.js 919978783238 hello_world
   ```

## Troubleshooting

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
- [Meta WhatsApp Implementation Guide](../../docs/WHATSAPP_IMPLEMENTATION_GUIDE.md)
- [Meta WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)

## Support

For issues or questions:
1. Check the logs in your terminal/console
2. Review the documentation files
3. Test with the direct script to isolate issues
4. Check Meta Business Manager for template approvals and account status
