# Meta WhatsApp Integration - Quick Setup Guide

## Step 1: Add Environment Variables

Add these to your `.env.local` file (create it if it doesn't exist):

```bash
# Meta WhatsApp Business API Configuration
META_WHATSAPP_PHONE_NUMBER_ID=131371496722301
META_WHATSAPP_ACCESS_TOKEN=EAAVramqNmOUBPo4KSL9HjZBpFEo4pQO2MZCtG4bHpy4D0E1O7Ru2ks0yI0eZCJWIc72umrkifDMnjHuJuMJjcWSzwUXYsMJph1XQrlsq8wic7ZAfYD6gYmVuGPEeEMQZCxVAjUuEfxYzQnR1qiyDZAbfTctnd3PvLEK1HpMVfV8ZBCkFNf9ekVIJR3IwNQeu3YYoIyFs8ZA8yDyKnZBWdhI9fvWpfH4uHwjYjT3aclSBxvPoENaUZD

# Optional (defaults to v22.0)
META_GRAPH_API_VERSION=v22.0
```

## Step 2: Restart Your Application

After adding the environment variables, restart your Next.js server:

```powershell
# Stop the server (Ctrl+C)
# Then start again
npm run dev
```

## Step 3: Test the Integration

### Option A: Test with Direct Script
```powershell
node scripts/whatsapp/send-meta-direct.js 919978783238 hello_world
```

### Option B: Run Comprehensive Test
```powershell
node scripts/whatsapp/test-meta-whatsapp.js
```

### Option C: Test via API (Server must be running)
```powershell
# In PowerShell
curl -X POST http://localhost:3000/api/whatsapp/send `
  -H "Content-Type: application/json" `
  -d '{\"to\": \"+919978783238\", \"campaignName\": \"hello_world\", \"templateParams\": []}'
```

## Step 4: Verify Configuration

Check which provider is active:

```powershell
curl http://localhost:3000/api/whatsapp/config
```

You should see:
```json
{
  "provider": "meta",
  "isMetaConfigured": true,
  "meta": {
    "phoneNumberId": "131371496722301",
    "apiVersion": "v22.0",
    "hasAccessToken": true
  }
}
```

## Step 5: Use in Your Code

Now you can use WhatsApp in your application:

```typescript
import { sendWhatsAppMessage } from '@/lib/whatsapp';

// Send template message
const result = await sendWhatsAppMessage({
  to: '+919978783238',
  templateParams: ['Customer Name', 'Booking Details'],
  campaignName: 'booking_confirmation',
  saveToDb: true,
});

// Send text message
const result2 = await sendWhatsAppMessage({
  to: '+919978783238',
  message: 'Hello from Meta WhatsApp!',
  saveToDb: true,
});
```

## Common Issues

### Issue: "Missing Meta WhatsApp configuration"
**Solution:** 
- Verify variables are in `.env.local` 
- Restart the server
- Check variable names match exactly

### Issue: "Template not found"
**Solution:**
- Go to Meta Business Manager
- WhatsApp > Message Templates
- Ensure template is approved
- Use exact template name (case-sensitive)

### Issue: "Invalid OAuth access token"
**Solution:**
- Generate a new token from Meta Business Manager
- For production, use System User token (doesn't expire)
- Temporary tokens expire after 24-72 hours

### Issue: Message sent but not received
**Solution:**
- Check phone number has WhatsApp installed
- Verify number is added to test numbers in Meta dashboard
- Check Meta Business Manager for delivery status

## Next Steps

1. ✅ Configure environment variables
2. ✅ Test with direct script
3. ✅ Verify API endpoints work
4. 📝 Create your own message templates in Meta Business Manager
5. 📝 Get templates approved by Meta
6. 🚀 Integrate into your application workflows

## Resources

- [Full Documentation](../docs/META_WHATSAPP_INTEGRATION.md)
- [Meta WhatsApp API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Message Templates Guide](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates)
- [Test Scripts README](../scripts/whatsapp/README.md)

## Support

Having issues? 
1. Check the console/terminal for error messages
2. Review the full documentation
3. Test with `send-meta-direct.js` to isolate the issue
4. Check Meta Business Manager for account status
