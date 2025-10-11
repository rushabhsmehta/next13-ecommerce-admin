# WhatsApp Free-Form Messaging - Deployment Checklist

Use this checklist when deploying the new free-form messaging features to production.

## ✅ Pre-Deployment Checklist

### 1. Environment Variables
- [ ] Verify `.env` or `.env.local` has all required variables:
  - `META_WHATSAPP_PHONE_NUMBER_ID`
  - `META_WHATSAPP_ACCESS_TOKEN`
  - `META_GRAPH_API_VERSION` (optional, defaults to v22.0)

### 2. Database
- [ ] Run Prisma migrations (if any schema changes):
  ```bash
  npx prisma migrate deploy
  ```
- [ ] Verify `WhatsAppMessage` table exists
- [ ] Verify `WhatsAppSession` table exists
- [ ] Test database connection

### 3. API Endpoints
- [ ] Test `/api/whatsapp/send-message` (POST) - Send message
- [ ] Test `/api/whatsapp/send-message?to=+919978783238` (GET) - Check window
- [ ] Verify `/api/whatsapp/webhook` is receiving messages

### 4. Scripts
- [ ] Test `check-messaging-window.js` works locally
- [ ] Test `send-text-message.js` delivers messages
- [ ] Test `test-window-logic.js` passes all tests

### 5. Documentation
- [ ] Review `WHATSAPP_QUICK_REFERENCE.md`
- [ ] Review `WHATSAPP_MESSAGING_GUIDE.md`
- [ ] Update team on new features

## 🚀 Deployment Steps

### Step 1: Deploy Code
```bash
# Push to repository
git add .
git commit -m "feat: Add WhatsApp free-form messaging with 24-hour window validation"
git push origin main

# Or deploy to Vercel
vercel --prod
```

### Step 2: Verify Environment Variables in Production
If using Vercel:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Verify these exist:
   - `META_WHATSAPP_PHONE_NUMBER_ID`
   - `META_WHATSAPP_ACCESS_TOKEN`
   - `META_GRAPH_API_VERSION`
3. Redeploy if you added/changed any variables

### Step 3: Test Production Endpoints
```bash
# Replace with your production URL
PROD_URL="https://admin.aagamholidays.com"

# Test window check (GET)
curl "$PROD_URL/api/whatsapp/send-message?to=%2B919978783238"

# Test sending message (POST)
curl -X POST "$PROD_URL/api/whatsapp/send-message" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+919978783238",
    "message": "Production test - please ignore",
    "checkWindow": true
  }'
```

### Step 4: Verify Database Logging
Check that messages are being saved:
```bash
# Using Prisma Studio
npx prisma studio

# Or query directly
npx prisma db execute --sql "
  SELECT id, direction, status, message, createdAt 
  FROM WhatsAppMessage 
  ORDER BY createdAt DESC 
  LIMIT 10
"
```

### Step 5: Test with Real Customer
1. Have a customer send you a message (or send from your test number)
2. Wait for webhook to save the message
3. Check window status:
   ```bash
   node scripts/whatsapp/check-messaging-window.js +919978783238
   ```
4. Send reply:
   ```bash
   node scripts/whatsapp/send-text-message.js +919978783238 "Test reply"
   ```
5. Verify customer receives the message

## ✅ Post-Deployment Verification

### Immediate Checks (Within 1 hour)
- [ ] Webhook is receiving incoming messages
- [ ] Messages are being saved to database
- [ ] Can send free-form messages within 24-hour window
- [ ] API returns proper errors when window expired
- [ ] No console errors in production logs

### Daily Monitoring (First Week)
- [ ] Check message delivery success rate
- [ ] Monitor for error codes 131047, 131026
- [ ] Verify database growth is normal
- [ ] Check for any timeout or performance issues

### Weekly Review
- [ ] Review conversation metrics
- [ ] Identify common customer inquiries
- [ ] Update auto-response rules if needed
- [ ] Check Meta Business Manager for any account issues

## 🔧 Troubleshooting Production Issues

### Issue: Messages not being saved to database

**Check:**
1. Verify webhook URL is correct in Meta Business Manager
2. Check webhook endpoint logs: `/api/whatsapp/webhook`
3. Verify database connection in production
4. Check for Prisma client errors

**Fix:**
```bash
# Regenerate Prisma client
npx prisma generate

# Redeploy
vercel --prod
```

### Issue: 24-hour window always showing "Cannot message"

**Check:**
1. Verify incoming messages are being saved with `direction: "inbound"`
2. Check `createdAt` timestamps in database
3. Verify phone number format matches between incoming and outgoing

**Debug:**
```typescript
// Add to API endpoint temporarily
console.log('Checking for phone:', normalizedPhone);
console.log('Last inbound:', lastInboundMessage);
console.log('Hours since:', hoursSinceLastMessage);
```

### Issue: Error 131047 even within 24 hours

**Possible Causes:**
1. Customer actually sent message more than 24 hours ago
2. Time zone issues in database
3. Meta's clock vs your server clock mismatch

**Fix:**
- Double-check actual time since customer's last message
- Ensure server timezone is UTC
- Add buffer (e.g., 23.5 hours instead of 24)

### Issue: API endpoint returns 401 Unauthorized

**Check:**
1. Verify Clerk authentication is working
2. Check if endpoint requires auth (it does by default)
3. Test with proper authentication headers

**Temporary workaround (NOT for production):**
Comment out auth check for testing:
```typescript
// const { userId } = auth();
// if (!userId) {
//   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
// }
```

## 📊 Monitoring & Metrics

### Key Metrics to Track

1. **Message Delivery Rate**
   ```sql
   SELECT 
     status,
     COUNT(*) as count,
     COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
   FROM WhatsAppMessage
   WHERE direction = 'outbound'
   AND createdAt > NOW() - INTERVAL '7 days'
   GROUP BY status;
   ```

2. **Window Expiration Rate**
   - How often do you try to message after 24 hours?
   - Track 131047 errors

3. **Average Response Time**
   ```sql
   SELECT 
     AVG(
       EXTRACT(EPOCH FROM (
         (SELECT MIN(createdAt) 
          FROM WhatsAppMessage out 
          WHERE out.direction = 'outbound' 
          AND out.to = inbound.from 
          AND out.createdAt > inbound.createdAt)
         - inbound.createdAt
       ))
     ) / 60 as avg_response_minutes
   FROM WhatsAppMessage inbound
   WHERE direction = 'inbound';
   ```

## 📱 User Training

### For Team Members Using the System

**Scenario 1: Customer just messaged**
```bash
# You have 24 hours to reply with any message
node scripts/whatsapp/send-text-message.js +919978783238 "Thanks for your message!"
```

**Scenario 2: Not sure if you can message**
```bash
# Always check first
node scripts/whatsapp/check-messaging-window.js +919978783238

# If OK, send message
# If expired, use template instead
```

**Scenario 3: Window expired**
```bash
# Use approved template to re-engage
node scripts/whatsapp/send-welcome-template.js +919978783238
```

## 🎯 Success Criteria

Deployment is successful if:

- ✅ Can send free-form messages within 24 hours
- ✅ Automatic window validation prevents errors
- ✅ All messages logged to database
- ✅ Webhook receives and saves incoming messages
- ✅ Scripts work for team members
- ✅ Clear error messages when window expired
- ✅ No impact on existing template messaging

## 📞 Support Contacts

If issues arise:

1. **Check Documentation**
   - `docs/WHATSAPP_QUICK_REFERENCE.md`
   - `docs/WHATSAPP_MESSAGING_GUIDE.md`

2. **Run Diagnostics**
   ```bash
   node scripts/whatsapp/test-window-logic.js
   ```

3. **Review Logs**
   - Check Vercel deployment logs
   - Check browser console
   - Check database logs

4. **Meta Support**
   - WhatsApp Business Platform: https://developers.facebook.com/support
   - Meta Business Help Center: https://www.facebook.com/business/help

## 🔄 Rollback Plan

If critical issues occur:

### Quick Rollback (Keep new code, disable feature)
```typescript
// In src/app/api/whatsapp/send-message/route.ts
// Add at the top of POST handler:
return NextResponse.json(
  { error: 'Feature temporarily disabled' },
  { status: 503 }
);
```

### Full Rollback (Previous deployment)
```bash
# Vercel
vercel rollback [deployment-url]

# Or git
git revert HEAD
git push origin main
```

### Fallback to Templates Only
If free-form messaging has issues, continue using template messages:
```bash
node scripts/whatsapp/send-welcome-template.js +919978783238
```

## ✅ Final Checklist

Before marking deployment complete:

- [ ] All tests passing in production
- [ ] Team trained on new features
- [ ] Documentation accessible to team
- [ ] Monitoring set up
- [ ] Rollback plan documented
- [ ] Customer test successful
- [ ] No errors in production logs
- [ ] Database backup confirmed

---

**Deployment Date:** _____________

**Deployed By:** _____________

**Production URL:** https://admin.aagamholidays.com

**Notes:** _____________________________________________

_____________________________________________________
