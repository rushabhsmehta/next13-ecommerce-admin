# 🔍 WhatsApp Webhook Not Receiving Real Messages - Debugging Guide

## Your Situation:
- ✅ Sending templates TO +919978783238 works
- ✅ Meta's test webhook works
- ❌ Messages FROM +919978783238 don't trigger webhook

---

## 🚨 Most Common Causes (Check in Order):

### 1. ⏰ 24-Hour Customer Care Window

**Most Likely Cause!**

WhatsApp only allows you to receive messages if:
- Customer initiated the conversation first, OR
- You're within 24 hours of their last message

**The Problem:**
- When YOU send a template first, it doesn't open a conversation window
- Customer needs to reply to that template to start the conversation
- Only THEN can you receive their messages via webhook

**Solution:**
```
1. Send your template to +919978783238
2. Customer receives it on WhatsApp
3. Customer MUST reply to that template message
4. Now webhook will work for 24 hours
```

---

### 2. 📱 Webhook Subscription Not Active

**Check Meta Dashboard:**

1. Go to: **WhatsApp > Configuration > Webhooks**
2. After selecting "WhatsApp Business Account"
3. Make sure you clicked **"Subscribe"** for these fields:
   - ✅ **messages** - Must have a checkmark/subscribed status
   - ✅ **message_status** - Must have a checkmark/subscribed status

**If not subscribed:**
- Meta won't send you real messages
- But test messages still work (that's why test succeeded)

---

### 3. 🔐 Meta App Review Status

**Check if your app is in development mode:**

1. Go to: **App Settings > Basic**
2. Look for "App Mode": 
   - 🟡 **Development Mode** - Only works for test numbers
   - 🟢 **Live Mode** - Works for all numbers

**If in Development Mode:**
- Add +919978783238 as a test phone number
- Or switch app to Live mode (requires app review)

**To add test number:**
1. Go to **WhatsApp > Getting Started**
2. Find "Test phone numbers" or "Add phone number"
3. Add +919978783238

---

### 4. 📞 Phone Number Configuration

**Verify the phone number ID matches:**

Your `.env` has:
```
META_WHATSAPP_PHONE_NUMBER_ID=769802949556238
```

**Check:**
1. Go to **WhatsApp > API Setup**
2. Find your business phone number
3. Verify the Phone Number ID matches exactly
4. Make sure this number is the one receiving messages

---

### 5. 🌐 Webhook URL Must Be Live

**Test your production webhook:**

```powershell
# Test if webhook is accessible
curl https://admin.aagamholidays.com/api/whatsapp/webhook
```

**Common issues:**
- Server is down
- DNS not pointing correctly
- SSL certificate expired
- Firewall blocking Meta's IPs

---

### 6. 📋 Check Meta's Webhook Logs

**Most Important Debug Step!**

1. Go to **WhatsApp > Configuration > Webhooks**
2. Scroll down to find **"Recent Deliveries"** or **"Webhook Events"**
3. Look for:
   - ❌ Failed deliveries (shows errors)
   - ⏰ Timestamp of last attempt
   - 📊 Response codes from your server

**What to look for:**
- No events = Meta isn't sending (check subscription)
- 403/401 errors = Authentication issue
- 500 errors = Your webhook code has a bug
- Timeout = Your webhook is too slow

---

### 7. 🔍 Enable Webhook Logging

Add detailed logging to see what's happening:

Run this to check your server logs:

```bash
# If on Vercel
vercel logs https://admin.aagamholidays.com --follow

# If using PM2
pm2 logs

# Check for webhook events
grep "Incoming message" logs
```

---

## 🧪 Quick Diagnostic Test

Run this PowerShell script to test everything:

```powershell
Write-Host "🔍 WhatsApp Webhook Diagnostic" -ForegroundColor Cyan
Write-Host ""

# 1. Test webhook endpoint is live
Write-Host "1. Testing webhook endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://admin.aagamholidays.com/api/whatsapp/webhook" -Method GET -TimeoutSec 10
    Write-Host "   ✅ Webhook is accessible (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Webhook not accessible: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Test verification endpoint
Write-Host ""
Write-Host "2. Testing webhook verification..." -ForegroundColor Yellow
try {
    $verifyUrl = "https://admin.aagamholidays.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=aagam_whatsapp_webhook_2024_secure_token&hub.challenge=test123"
    $challenge = Invoke-RestMethod -Uri $verifyUrl -Method GET
    if ($challenge -eq "test123") {
        Write-Host "   ✅ Webhook verification works" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Unexpected response: $challenge" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Verification failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Check database for recent messages
Write-Host ""
Write-Host "3. Check your database for messages from +919978783238" -ForegroundColor Yellow
Write-Host "   Run: SELECT * FROM WhatsAppMessage WHERE from LIKE '%919978783238%' ORDER BY createdAt DESC LIMIT 5;" -ForegroundColor Cyan

Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Check Meta Dashboard > Webhooks > Recent Deliveries" -ForegroundColor White
Write-Host "   2. Verify webhook subscriptions are active (messages + message_status)" -ForegroundColor White
Write-Host "   3. Make sure +919978783238 replied to your template (24h window rule)" -ForegroundColor White
Write-Host "   4. Check if app is in Development mode (add as test number)" -ForegroundColor White
```

---

## ✅ Most Likely Solution:

Based on your description, **#1 (24-Hour Window)** is the most likely issue:

### Do This:
1. Send your template to +919978783238 ✅ (already done)
2. **From +919978783238 WhatsApp**, reply to that template message
3. Now send another message from +919978783238
4. Check webhook should trigger now

### Why:
- WhatsApp business rules require customer to initiate
- Template alone doesn't open the conversation window
- Customer MUST reply to open the 24-hour window

---

## 🔧 Enable Debug Mode

Update your webhook to log ALL incoming requests:

Add this to `src/app/api/whatsapp/webhook/route.ts` at the very start of POST function:

```typescript
export async function POST(request: NextRequest) {
  // Add this logging at the very top
  console.log('🔔 Webhook POST received at:', new Date().toISOString());
  console.log('📨 Headers:', JSON.stringify(Object.fromEntries(request.headers)));
  
  try {
    const body = await request.json();
    console.log('📦 Full webhook body:', JSON.stringify(body, null, 2));
    
    // ... rest of your code
```

This will show you if Meta is even calling your webhook.

---

## 📞 Contact Meta Support If:

- All subscriptions are active
- Customer replied to template
- Webhook logs show no attempts from Meta
- Test webhooks work but real ones don't

**Meta may need to:**
- Verify webhook subscriptions on their end
- Check for any account restrictions
- Confirm phone number is properly configured

---

## Quick Checklist:

- [ ] Customer replied to the template (not just received it)
- [ ] "messages" field is SUBSCRIBED in Meta dashboard
- [ ] "message_status" field is SUBSCRIBED in Meta dashboard
- [ ] App mode allows the phone number (test number added if in dev mode)
- [ ] Webhook URL is accessible from internet
- [ ] SSL certificate is valid
- [ ] Check Meta's "Recent Deliveries" log
- [ ] Added debug logging to webhook
- [ ] Checked server logs for incoming requests

---

**Start with #1 - Have +919978783238 reply to your template, then try again!**
