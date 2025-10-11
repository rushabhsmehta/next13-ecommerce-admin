# Quick Reference: WhatsApp Free-Form Messaging

## ✅ What's Working Now

Your WhatsApp messaging system is fully functional:

- ✅ **Template messages** (like `tour_package_marketing`) - Working
- ✅ **Free-form text messages** - Working (tested on Oct 11)
- ✅ **Webhook handler** - Saves all incoming messages
- ✅ **Database tracking** - Stores all messages with timestamps
- ✅ **24-hour window validation** - API checks before sending

## 📋 Quick Commands

### Check if you can message a customer

```bash
node scripts/whatsapp/check-messaging-window.js +919978783238
```

### Send a free-form message (within 24-hour window)

```bash
node scripts/whatsapp/send-text-message.js +919978783238 "Your message here"
```

### Send a template message (anytime)

```bash
node scripts/whatsapp/send-welcome-template.js +919978783238
```

## 🔑 Key Concepts

### 24-Hour Messaging Window

```
Customer sends message → 24-hour window starts
├─ 0-24 hours: ✅ Send any free-form message
└─ 24+ hours: ❌ Must use approved templates only
```

### Message Flow

1. **Customer sends you a message** → Webhook saves it to database
2. **You have 24 hours** to send free-form replies
3. **After 24 hours** → Window expires, must use templates
4. **Customer replies again** → New 24-hour window opens

## 🚀 Using the API

### Check messaging window status

```bash
GET /api/whatsapp/send-message?to=+919978783238
```

**Response:**
```json
{
  "canMessage": true,
  "hoursRemaining": 18.5,
  "recommendation": "You can send free-form messages"
}
```

### Send a message

```bash
POST /api/whatsapp/send-message
Content-Type: application/json

{
  "to": "+919978783238",
  "message": "Thank you for your interest!",
  "checkWindow": true
}
```

**Success Response:**
```json
{
  "success": true,
  "messageId": "wamid.HBgM...",
  "to": "+919978783238"
}
```

**Window Expired Response (403):**
```json
{
  "error": "Cannot send message - customer has not messaged you recently",
  "requiresTemplate": true
}
```

## 📊 Database Schema

Messages are automatically tracked in the database:

```
WhatsAppMessage
├─ direction: "inbound" (from customer) or "outbound" (to customer)
├─ status: "sent", "delivered", "read", "failed"
├─ createdAt: Timestamp (for 24-hour window calculation)
├─ from: Sender phone (format: whatsapp:919978783238)
├─ to: Recipient phone
└─ message: Message text
```

## 🎯 Best Practices

### ✅ DO

- Check messaging window before sending
- Use templates when window expired
- Save all messages to database
- Show countdown timer in admin UI

### ❌ DON'T

- Send free-form messages after 24 hours (will fail)
- Assume customer can always receive messages
- Send without checking window status first

## 🔧 Implementation Files

### API Endpoints

- **`src/app/api/whatsapp/send-message/route.ts`** - Send messages with window validation
- **`src/app/api/whatsapp/webhook/route.ts`** - Receive incoming messages

### Scripts

- **`scripts/whatsapp/send-text-message.js`** - Send free-form message
- **`scripts/whatsapp/check-messaging-window.js`** - Check window status
- **`scripts/whatsapp/send-welcome-template.js`** - Send template message
- **`scripts/whatsapp/test-window-logic.js`** - Test 24-hour logic

### Database

- **`schema.prisma`** - WhatsAppMessage model (line 1289)

## 🐛 Troubleshooting

### "Message not reaching customer"

**Cause:** 24-hour window expired

**Solution:**
```bash
# 1. Check window status
node scripts/whatsapp/check-messaging-window.js +919978783238

# 2. If expired, use template
node scripts/whatsapp/send-welcome-template.js +919978783238
```

### Error Code 131047

**Message:** "Re-engagement required"

**Solution:** The 24-hour window has expired. Send an approved template message to re-engage.

### Error Code 131026

**Message:** "Message undeliverable"

**Possible Causes:**
1. Customer hasn't messaged you in 24 hours
2. Wrong phone number format
3. Customer blocked your number

**Solution:** Verify phone number and check window status

## 📚 Full Documentation

For complete details, see:
- **[WhatsApp Messaging Guide](./WHATSAPP_MESSAGING_GUIDE.md)** - Complete reference
- **[Meta Setup Guide](./QUICK_SETUP_META_WHATSAPP.md)** - Initial configuration
- **[Webhook Guide](./WEBHOOK_SETUP_GUIDE.md)** - Webhook setup

## 🎉 What You Can Do Now

1. **Reply to customers** who messaged you recently (within 24 hours)
2. **Track all conversations** in the database
3. **Check window status** before sending
4. **Automatically fallback** to templates when window expires
5. **Build admin UI** to manage conversations

## Next Steps (Optional)

- [ ] Build admin dashboard page for conversations
- [ ] Add real-time countdown timer for 24-hour window
- [ ] Implement auto-response rules for common inquiries
- [ ] Add message templates for quick replies
- [ ] Create conversation history view

---

**Need Help?** Check the full documentation or test with:
```bash
node scripts/whatsapp/test-window-logic.js
```
