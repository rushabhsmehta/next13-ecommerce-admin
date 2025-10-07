# 📥 WhatsApp Webhook Configuration - Step-by-Step Guide

## ✅ Your Webhook is Already Built!

Your application already has a fully functional webhook endpoint at:
```
https://admin.aagamholidays.com/api/whatsapp/webhook
```

## 🔧 Meta Dashboard Configuration Steps

### Step 1: Access Webhooks Configuration

1. Go to [Meta for Developers](https://developers.facebook.com/apps)
2. Select your app: **App ID: 1525479681923301**
3. In the left sidebar, navigate to: **WhatsApp > Configuration > Webhooks**

### Step 2: Enter Webhook Details

Fill in these exact values in the Meta dashboard:

| Field | Value |
|-------|-------|
| **Callback URL** | `https://admin.aagamholidays.com/api/whatsapp/webhook` |
| **Verify token** | `aagam_whatsapp_webhook_2024_secure_token` |

### Step 3: Click "Verify and save"

Meta will send a GET request to verify your webhook:
- ✅ Your endpoint will automatically respond with the challenge code
- ✅ If successful, you'll see "Webhook verified successfully"

### Step 4: Subscribe to Webhook Fields

After verification, subscribe to these fields:

- ✅ **messages** - To receive incoming messages from customers
- ✅ **message_status** - To track message delivery (sent, delivered, read)

Click **"Subscribe"** for each field.

---

## 🔍 What Your Webhook Does

### For Incoming Messages (customers texting you):
```javascript
{
  "from": "+919978783238",          // Customer's phone number
  "type": "text",                    // Message type (text, image, etc.)
  "text": { "body": "Hello!" },     // Message content
  "timestamp": "1696704000",         // When sent
  "id": "wamid.xxx..."              // Message ID
}
```

**Your webhook automatically:**
- 📥 Receives the message
- 💾 Saves it to your database (`WhatsAppMessage` table)
- 📝 Logs it for debugging
- ✅ Responds with 200 OK to Meta

### For Message Status Updates:
```javascript
{
  "id": "wamid.xxx...",     // Your sent message ID
  "status": "delivered"     // sent → delivered → read
}
```

**Your webhook automatically:**
- 📊 Updates message status in database
- 🔄 Reflects changes in your UI
- ✅ Acknowledges receipt

---

## 🧪 Testing Your Webhook

### Test 1: Verify Token (Manual)
```bash
curl "https://admin.aagamholidays.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=aagam_whatsapp_webhook_2024_secure_token&hub.challenge=test123"
```

**Expected Response:** `test123`

### Test 2: Send Test Message
Once configured in Meta dashboard:
1. Send yourself a test message from WhatsApp UI
2. Check your application logs
3. Verify message appears in database

### Test 3: Check Database
```sql
SELECT * FROM "WhatsAppMessage" 
WHERE direction = 'inbound' 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

---

## 📋 Environment Variables Checklist

Make sure these are set in your production environment (`.env.production` or Vercel/deployment platform):

```bash
# Required for webhook verification
META_WEBHOOK_VERIFY_TOKEN=aagam_whatsapp_webhook_2024_secure_token

# Required for sending messages (you already have these)
META_WHATSAPP_PHONE_NUMBER_ID=769802949556238
META_WHATSAPP_ACCESS_TOKEN=EAAVramq...
META_WHATSAPP_BUSINESS_ACCOUNT_ID=139266579261557

# Optional but recommended
META_APP_ID=1525479681923301
META_APP_SECRET=04f865c499e27602645a698925cff418
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "Verification Failed"
**Cause:** Token mismatch
**Solution:** 
- Ensure `META_WEBHOOK_VERIFY_TOKEN` in `.env` exactly matches what you enter in Meta dashboard
- No extra spaces, quotes, or characters
- Restart your production server after updating `.env`

### Issue 2: "Webhook URL not reachable"
**Cause:** Server not accessible
**Solution:**
- Verify your domain is live: `https://admin.aagamholidays.com`
- Check SSL certificate is valid (Meta requires HTTPS)
- Test endpoint manually with curl

### Issue 3: "Messages not appearing"
**Cause:** Database connection or webhook not subscribed
**Solution:**
- Check you subscribed to **"messages"** field
- Verify database connection in production
- Check application logs for errors

### Issue 4: "Status updates not working"
**Cause:** Not subscribed to message_status
**Solution:**
- Subscribe to **"message_status"** field in Meta dashboard
- Ensure `updateMessageStatus` function works

---

## 🎯 Next Steps After Configuration

### 1. View Incoming Messages in Your UI

Navigate to: **Settings > WhatsApp**

The messages will automatically appear in:
- Recent conversations list (left sidebar)
- Chat history when you select a contact

### 2. Enable Auto-Replies (Optional)

Edit `src/app/api/whatsapp/webhook/route.ts` around line 99:

```typescript
// TODO: Implement auto-replies or business logic here
// Example:
if (message.text?.body.toLowerCase().includes('hello')) {
  // Send auto-reply using your existing send API
  await fetch('https://admin.aagamholidays.com/api/whatsapp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: message.from,
      message: 'Hello! Thanks for contacting us. How can we help?'
    })
  });
}
```

### 3. Set Up Monitoring

Add webhook monitoring to track:
- Number of incoming messages per day
- Response times
- Failed deliveries
- Customer engagement metrics

### 4. Implement Business Logic

Examples:
- Keyword-based auto-responses
- Automatic booking confirmations
- Customer service routing
- Order status updates

---

## 📞 Support & Resources

### Meta Documentation
- [Webhooks Getting Started](https://developers.facebook.com/docs/graph-api/webhooks/getting-started)
- [WhatsApp Webhook Payload Examples](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples)
- [Message Status Callbacks](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components#message-status-object)

### Your Implementation Files
- Webhook endpoint: `src/app/api/whatsapp/webhook/route.ts`
- Helper functions: `src/lib/whatsapp.ts`
- Database schema: `prisma/schema.prisma` (WhatsAppMessage model)
- UI component: `src/app/(dashboard)/settings/whatsapp/page.tsx`

---

## ✅ Configuration Checklist

Before clicking "Verify and save" in Meta dashboard:

- [ ] Production server is running
- [ ] `.env` has `META_WEBHOOK_VERIFY_TOKEN=aagam_whatsapp_webhook_2024_secure_token`
- [ ] Server has been restarted after updating `.env`
- [ ] URL is exactly: `https://admin.aagamholidays.com/api/whatsapp/webhook`
- [ ] Verify token is exactly: `aagam_whatsapp_webhook_2024_secure_token`
- [ ] SSL certificate is valid (test in browser)
- [ ] Database connection works in production

After successful verification:

- [ ] Clicked "Subscribe" for **messages** field
- [ ] Clicked "Subscribe" for **message_status** field
- [ ] Sent test message to verify incoming messages work
- [ ] Checked database for saved messages
- [ ] Reviewed application logs for errors

---

## 🎉 Success Indicators

You'll know it's working when:

1. ✅ Meta dashboard shows "Subscribed" next to messages and message_status
2. ✅ Test message appears in your WhatsApp UI within seconds
3. ✅ Database has new row in `WhatsAppMessage` table with `direction = 'inbound'`
4. ✅ Application logs show: `✅ Saved incoming message [id] from [phone]`
5. ✅ Message status updates appear for sent messages (delivered, read)

---

**Need Help?** Check the troubleshooting section or review the Meta documentation links above.
