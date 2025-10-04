# 🚀 WhatsApp Integration - Quick Start Guide

> **Quick Reference**: Get WhatsApp working in 15 minutes

---

## ✅ Prerequisites Checklist

- [ ] Meta Business Account created
- [ ] WhatsApp Business Account setup
- [ ] Phone Number verified
- [ ] `hello_world` template approved
- [ ] Access token generated

---

## 🔧 Step 1: Environment Variables (2 min)

Update `.env` and `.env.local`:

```bash
# ✅ THESE ARE ALREADY SET!
META_WHATSAPP_PHONE_NUMBER_ID=131371496722301
META_WHATSAPP_BUSINESS_ACCOUNT_ID=139266579261557
META_WHATSAPP_ACCESS_TOKEN=EAAVramqNmOUBPugZB4CosGSEzCuuWDDr1ytLZCOFYoKahSSq2pslZCBYEZB6Qlvso1cSAm4IMboPhuxErcaLWk6clA2ESRZBsMcKZBOv6ObtGqfiA1SJ2S9ZCaiEfSLOkI6bpLTMrT6Dy9KVRTIvFsrX9apB8nPDuJQAK1UuEAy5QR9uR1RddtAY5LttxYTdaOr4nvRSZCZADRjteB88SDODyBlq9BuXW1P9yAYgFIemjwOamYggZD
META_GRAPH_API_VERSION=v22.0

# Optional
META_APP_ID=1525479681923301
META_APP_SECRET=04f865c499e27602645a698925cff418
META_WEBHOOK_VERIFY_TOKEN=aagam_whatsapp_webhook_2024_secure_token
```

---

## 📱 Step 2: Test Basic Send (3 min)

### Option A: PowerShell Command

```powershell
$headers = @{
    'Authorization' = 'Bearer EAAVramqNmOUBPugZB4CosGSEzCuuWDDr1ytLZCOFYoKahSSq2pslZCBYEZB6Qlvso1cSAm4IMboPhuxErcaLWk6clA2ESRZBsMcKZBOv6ObtGqfiA1SJ2S9ZCaiEfSLOkI6bpLTMrT6Dy9KVRTIvFsrX9apB8nPDuJQAK1UuEAy5QR9uR1RddtAY5LttxYTdaOr4nvRSZCZADRjteB88SDODyBlq9BuXW1P9yAYgFIemjwOamYggZD'
    'Content-Type' = 'application/json'
}

$body = @{
    messaging_product = "whatsapp"
    to = "919978783238"
    type = "template"
    template = @{
        name = "vietnam_calling"
        language = @{
            code = "en"
        }
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri 'https://graph.facebook.com/v22.0/131371496722301/messages' -Method Post -Headers $headers -Body $body
```

### Option B: Node.js Script

```bash
node scripts/whatsapp/test-vietnam-calling-template.js
```

**Expected Result**: Message received on +919978783238 ✅

---

## 🎯 Step 3: Use in Your App (5 min)

### Send Template Message

```typescript
import { sendWhatsAppTemplate } from '@/lib/whatsapp';

const result = await sendWhatsAppTemplate({
  to: '+919978783238',
  templateName: 'vietnam_calling',
  languageCode: 'en',  // ✅ Use 'en' not 'en_US'
  bodyParams: [],
  saveToDb: true,
});

console.log('Sent:', result.success);
```

### Send via API Route

```typescript
const response = await fetch('/api/whatsapp/send-template', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: '+919978783238',
    templateName: 'vietnam_calling',
    languageCode: 'en',
    saveToDb: true,
  }),
});

const data = await response.json();
console.log('Success:', data.success);
```

---

## 🔍 Step 4: Verify in Database (2 min)

Check messages were logged:

```sql
SELECT * FROM "WhatsAppMessage" 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

---

## ⚠️ Common Issues & Fixes

### Issue 1: Template not found (error 132001)

**Problem**: Template name or language code wrong

**Fix**:
```typescript
// ❌ Wrong
languageCode: 'en_US'

// ✅ Correct
languageCode: 'en'
```

### Issue 2: Phone number format

**Problem**: Number format rejected

**Fix**:
```typescript
// ✅ Accepted formats:
'+919978783238'
'919978783238'
'9978783238' (will add country code)
```

### Issue 3: 404 Error

**Problem**: Wrong Phone Number ID

**Fix**: Check `.env` has correct `META_WHATSAPP_PHONE_NUMBER_ID`

---

## 📚 Available Templates

### Current Templates
- `hello_world` - Simple greeting (language: `en_US`)
- `vietnam_calling` - Vietnam tour promotion (language: `en`)

### Check Your Templates

```bash
# Via Meta Dashboard
https://business.facebook.com/wa/manage/message-templates/

# Via API (if you have business account ID)
curl -X GET \
  "https://graph.facebook.com/v22.0/139266579261557/message_templates" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎨 Create New Templates

### 1. Go to Meta Dashboard
https://business.facebook.com/wa/manage/message-templates/

### 2. Click "Create Template"

### 3. Fill Details
- **Name**: `booking_confirmation` (lowercase, underscores)
- **Category**: Utility
- **Language**: English
- **Body**:
  ```
  Hello {{1}},
  
  Your booking for {{2}} is confirmed!
  
  Date: {{3}}
  Booking ID: {{4}}
  
  We look forward to serving you!
  ```

### 4. Wait for Approval
- Usually 5-30 minutes for Utility templates
- Marketing templates take 24-48 hours

### 5. Use in Code
```typescript
await sendWhatsAppTemplate({
  to: customerPhone,
  templateName: 'booking_confirmation',
  languageCode: 'en',
  bodyParams: [
    'John Doe',           // {{1}}
    'Vietnam Package',    // {{2}}
    '2025-11-15',        // {{3}}
    'BK12345',           // {{4}}
  ],
});
```

---

## 🔄 Next Steps

1. ✅ **Test basic send** - Done!
2. 📝 **Create more templates** - Booking, payment, inquiry
3. 🔗 **Integrate with forms** - Add WhatsApp buttons
4. 🤖 **Automate workflows** - Send on booking creation
5. 📊 **Setup webhooks** - Track delivery status
6. 🎯 **Implement full redesign** - See `WHATSAPP_INTEGRATION_REDESIGN.md`

---

## 📖 Full Documentation

- **Complete Redesign**: `docs/WHATSAPP_INTEGRATION_REDESIGN.md`
- **Current Implementation**: `docs/META_WHATSAPP_INTEGRATION.md`
- **Quick Setup**: `docs/QUICK_SETUP_META_WHATSAPP.md`

---

## 🆘 Need Help?

### Test Connection
```bash
node scripts/whatsapp/test-meta-whatsapp.js
```

### Check Configuration
```bash
curl http://localhost:3000/api/whatsapp/config
```

### View Logs
```typescript
// Enable debug mode
WHATSAPP_DEBUG=1
```

---

**Last Updated**: October 4, 2025  
**Status**: ✅ Working  
**Next**: Implement full redesign for automation

