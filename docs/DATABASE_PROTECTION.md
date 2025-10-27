# 🛡️ Database Space Management System

**Last Updated:** October 27, 2025  
**Status:** ✅ Active Protection

## ⚠️ The Problem We Solved

Railway free tier has a **~512MB disk limit**. WhatsApp campaigns generate lots of data:
- Analytics events (logs every action)
- Campaign recipients (600+ per campaign)
- Messages (every sent message)
- Sessions (active conversations)

**Without cleanup, the database fills up in 2-3 days and MySQL crashes.**

---

## 🛡️ Protection Systems Now in Place

### 1. **Daily Automated Cleanup** (`scripts/auto-cleanup-daily.js`)

Runs automatically every day at 2:00 AM UTC to delete old data:

| Data Type | Retention Period | Why |
|-----------|-----------------|-----|
| Analytics events | 3 days | Just logs, not critical |
| WhatsApp messages | 7 days | Keep recent conversations |
| Inactive sessions | 2 hours | Old sessions no longer active |
| Old campaign recipients | 30 days | From completed campaigns only |

**How to use:**
```bash
# Run manually anytime
npm run cleanup-database

# Or directly
node scripts/auto-cleanup-daily.js
```

**What gets deleted:**
- ✅ Old analytics logs (older than 3 days)
- ✅ Old messages (older than 7 days)
- ✅ Inactive sessions (older than 2 hours)
- ✅ Recipients from old completed/cancelled campaigns (older than 30 days)

**What is PRESERVED:**
- ✅ All customers
- ✅ All active campaigns
- ✅ All templates
- ✅ Recent messages (last 7 days)
- ✅ Active campaign recipients
- ✅ Recent analytics (last 3 days)

---

### 2. **Analytics Sampling** (90% reduction)

**File:** `src/lib/whatsapp.ts` - `recordAnalyticsEvent()` function

Instead of logging EVERY event to the database, we now:
- **Sample 10%** of normal events (randomly selected)
- **Log 100%** of errors (always important)
- Still log everything to console for debugging

**Result:** 90% fewer analytics records = much slower disk growth

---

### 3. **Database Health Monitoring**

#### Quick Check (Command Line)
```bash
npm run check-db-health
```

Shows:
- Current record counts per table
- Total database size estimate
- Health warnings (green/yellow/red)
- Recommendations

#### API Endpoint
```
GET /api/whatsapp/database-health
```

Returns JSON with:
```json
{
  "status": "healthy|warning|critical",
  "totalRecords": 2500,
  "estimatedSizeMB": 3,
  "tables": {
    "analytics": 200,
    "messages": 150,
    "sessions": 10,
    "recipients": 1800,
    "customers": 300,
    "campaigns": 40
  },
  "warnings": [],
  "recommendations": ["Database is healthy"]
}
```

---

## 📅 Maintenance Schedule

### Daily (Automated)
- ✅ Cleanup runs at 2:00 AM UTC
- ✅ Deletes old data automatically
- ✅ Logs results to console

### Weekly (Manual - Recommended)
```bash
# Check database health
npm run check-db-health

# If warnings appear, run cleanup
npm run cleanup-database
```

### Monthly (Review)
- Check if retention policies need adjustment
- Review campaign cleanup effectiveness
- Consider upgrading Railway if still hitting limits

---

## 🚨 Emergency Procedures

### If Database Fills Up Again

1. **Check current size:**
   ```bash
   npm run check-db-health
   ```

2. **Run emergency cleanup:**
   ```bash
   npm run cleanup-database
   ```

3. **If database is completely full and won't start:**
   - Restore from Railway backup (Settings → Backups)
   - Change MySQL URL in environment variables
   - Run cleanup immediately after restore

4. **If cleanup isn't enough:**
   - Consider upgrading to Railway Hobby plan ($5/month)
   - Or manually delete specific old campaigns via Railway SQL console

---

## 🔧 Adjusting Retention Policies

Edit `scripts/auto-cleanup-daily.js` to change retention periods:

```javascript
// Current policies
const threeDaysAgo = new Date();  // Analytics retention
threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

const sevenDaysAgo = new Date();  // Message retention
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

const thirtyDaysAgo = new Date(); // Campaign recipient retention
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
```

**Trade-offs:**
- **Shorter retention** = Less disk usage, lose data faster
- **Longer retention** = More historical data, more disk usage

Current settings are balanced for Railway free tier.

---

## 📊 Health Thresholds

| Total Records | Status | Action |
|--------------|--------|--------|
| < 5,000 | 🟢 Healthy | Continue as normal |
| 5,000 - 10,000 | 🟡 Warning | Run cleanup soon |
| > 10,000 | 🔴 Critical | Run cleanup immediately |

---

## ✅ Verification After Restore

After restoring your database from backup, verify everything is working:

1. **Check current size:**
   ```bash
   npm run check-db-health
   ```
   
2. **Test cleanup (dry run to see what would be deleted):**
   ```bash
   node scripts/auto-cleanup-daily.js
   ```

3. **Check health endpoint:**
   - Navigate to: `https://your-domain.vercel.app/api/whatsapp/database-health`
   - Should show "healthy" status

4. **Deploy changes:**
   ```bash
   git add .
   git commit -m "Add database protection systems"
   git push
   ```

---

## 🎯 Expected Outcomes

With these protections:
- ✅ Database stays under 5,000 records normally
- ✅ ~90% reduction in analytics growth
- ✅ Automatic cleanup prevents crashes
- ✅ Railway free tier remains viable
- ✅ Can still monitor health anytime

**Before:** Database crashed every 2-3 days  
**After:** Database stays healthy indefinitely

---

## 📝 Files Changed

1. **`scripts/auto-cleanup-daily.js`** - Daily cleanup automation
2. **`scripts/check-db-health.js`** - Health check script
3. **`src/lib/whatsapp.ts`** - Analytics sampling (line ~918)
4. **`src/app/api/whatsapp/database-health/route.ts`** - Health API endpoint
5. **`package.json`** - Added convenience scripts
6. **`docs/DATABASE_PROTECTION.md`** - This documentation

---

## 🚀 Next Steps

1. ✅ Test health check: `npm run check-db-health`
2. ✅ Test cleanup: `npm run cleanup-database`
3. ✅ Deploy to production: `git push`
4. ✅ Monitor for 1 week to ensure stability
5. ⏰ Set reminder to check health weekly

---

## 💡 Pro Tips

- Run cleanup manually before large campaigns
- Check health after sending 500+ messages
- If approaching limits, consider Railway upgrade ($5/month)
- Analytics sampling can be adjusted (currently 10%)
- Keep recent backups in case of emergency

---

**Questions?** Check the health endpoint or run `npm run check-db-health`
