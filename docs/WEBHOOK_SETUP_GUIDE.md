# 🔧 Meta WhatsApp Webhook Configuration - Step by Step

## ✅ Step 1: Fill in the Webhook Form (Screenshot Page)

Based on your current Meta Dashboard screenshot, enter these values:

### **Callback URL:**
```
https://admin.aagamholidays.com/api/whatsapp/webhook
```

### **Verify token:**
```
aagam_whatsapp_webhook_2024_secure_token
```

### **What to do:**
1. Paste the **Callback URL** in the first field
2. Paste the **Verify token** in the second field
3. Click **"Verify and save"** button

---

## 📋 Step 2: Get Your App Secret

Before clicking "Verify and save", you need to get your **App Secret**:

### **How to get App Secret:**
1. In Meta Dashboard, go to **Settings** (left sidebar)
2. Click **Basic** under Settings
3. Find **App Secret** field
4. Click **Show** button
5. Copy the secret

### **Update your .env.local file:**
Replace this line:
```bash
META_APP_SECRET=your_app_secret_here
```

With:
```bash
META_APP_SECRET=paste_your_actual_app_secret_here
```

---

## 🎯 Step 3: Subscribe to Webhook Fields

After webhook is verified, you'll see subscription options:

### **Subscribe to these fields:**
- ✅ **messages** - To receive incoming messages
- ✅ **message_status** - To receive delivery status updates (sent, delivered, read)

---

## 🚀 Step 4: Test the Webhook

After configuration, Meta will send a test request. Your endpoint will:
- ✅ Receive webhook verification
- ✅ Respond with challenge code
- ✅ Complete verification automatically

---

## 📝 Complete Configuration Summary

### **Environment Variables Added:**

```bash
# App ID (already in your file)
META_APP_ID=1525479681923301

# App Secret (you need to add this)
META_APP_SECRET=your_actual_app_secret_from_meta_dashboard

# Webhook Verify Token (already in your file)
META_WEBHOOK_VERIFY_TOKEN=aagam_whatsapp_webhook_2024_secure_token
```

### **Webhook Configuration:**
- **URL:** `https://admin.aagamholidays.com/api/whatsapp/webhook`
- **Verify Token:** `aagam_whatsapp_webhook_2024_secure_token`
- **Subscriptions:** messages, message_status

---

## ✅ Verification Checklist

- [ ] **Callback URL** entered: `https://admin.aagamholidays.com/api/whatsapp/webhook`
- [ ] **Verify token** entered: `aagam_whatsapp_webhook_2024_secure_token`
- [ ] **App Secret** updated in `.env.local`
- [ ] Clicked **"Verify and save"**
- [ ] Subscribed to **messages** and **message_status**
- [ ] Webhook verification successful ✅

---

## 🆘 Troubleshooting

### "Verification Failed"
**Possible causes:**
1. Webhook URL not accessible (server not running or not deployed)
2. Verify token doesn't match
3. Endpoint returning wrong response

**Solution:**
- Make sure your server is deployed and accessible
- Verify token matches exactly: `aagam_whatsapp_webhook_2024_secure_token`
- Check server logs for errors

### "Cannot reach URL"
- Ensure `https://admin.aagamholidays.com` is live and accessible
- Check if `/api/whatsapp/webhook` endpoint exists
- Verify no firewall blocking Meta's requests

---

## 📊 What Happens After Setup

Once webhooks are configured, your app will:

1. **Receive message status updates:**
   ```
   Message sent → delivered → read
   ```

2. **Receive incoming messages:**
   ```javascript
   {
     from: "919978783238",
     text: { body: "Customer message" },
     timestamp: "1234567890"
   }
   ```

3. **Automatically update database:**
   - Message status changes saved to `WhatsAppMessage` table
   - Incoming messages logged

---

## 🎉 You're All Set!

After completing these steps:
- ✅ Webhooks configured
- ✅ Message delivery tracking enabled
- ✅ Two-way messaging ready
- ✅ Production-ready setup

**Next:** Send a test message and watch the status updates come through webhooks!

---

**Important Notes:**
- Keep your App Secret secure (never commit to git)
- The verify token must match exactly
- Your app must be deployed and accessible at the webhook URL
