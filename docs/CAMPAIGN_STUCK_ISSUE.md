# Campaign Stuck Issue - Diagnosis and Fix

## Problem

Your campaign stopped at **15 out of 678 messages** (2% complete) because the **background process crashed when the server restarted**.

## Root Cause

The current campaign implementation has a critical limitation:

### How It Works Now
1. When you click "Send Campaign", the API endpoint starts sending
2. It calls `processCampaignInBackground()` which runs in the same Node.js process
3. The function loops through recipients and sends messages
4. **Problem**: If the server restarts, the background process stops immediately

### What Happened
- Campaign started at 6:03 PM
- Sent 15 messages successfully  
- Server was restarted (or process crashed)
- Background processor stopped
- **662 messages are still pending** but nothing is processing them

## Immediate Solution

### Option 1: Resume via UI (Recommended)
1. Go to the campaign page: https://admin.aagamholidays.com/whatsapp/campaigns/51f580d8-6ac9-4a3b-a9ce-e6bc333fea65
2. Click **"Pause"** button
3. Click **"Resume"** button (this will restart the background process)

### Option 2: Resume via API Call
Make a POST request to restart the campaign:

```bash
# Using curl
curl -X POST https://admin.aagamholidays.com/api/whatsapp/campaigns/51f580d8-6ac9-4a3b-a9ce-e6bc333fea65/send

# Or using PowerShell
Invoke-WebRequest -Uri "https://admin.aagamholidays.com/api/whatsapp/campaigns/51f580d8-6ac9-4a3b-a9ce-e6bc333fea65/send" -Method POST
```

### Option 3: Use the Script
Run this command:
```bash
cd c:\Users\admin\Documents\GitHub\next13-ecommerce-admin
node scripts/whatsapp/resume-campaigns.js
```

## Long-Term Solution

The current implementation is **not production-ready** for large campaigns because:

❌ Background processes don't survive server restarts
❌ No retry mechanism if server crashes
❌ All processing happens in the web server process
❌ Resource-intensive for the web server

### Recommended Architecture

Implement one of these solutions:

#### Option A: Bull Queue with Redis (Best)
```typescript
// Install Bull
npm install bull @types/bull redis

// Create a queue
import Bull from 'bull';
const campaignQueue = new Bull('campaigns', {
  redis: process.env.REDIS_URL
});

// Add job to queue
campaignQueue.add('send-campaign', { campaignId });

// Process jobs (in a separate worker)
campaignQueue.process('send-campaign', async (job) => {
  await processCampaignInBackground(job.data.campaignId);
});
```

**Benefits:**
- ✅ Survives server restarts
- ✅ Automatic retries
- ✅ Job progress tracking
- ✅ Separate worker processes
- ✅ Rate limiting built-in

#### Option B: Separate Worker Process
Create a dedicated worker that polls for campaigns:

```typescript
// worker.ts
setInterval(async () => {
  const campaigns = await prisma.whatsAppCampaign.findMany({
    where: { status: 'sending' }
  });
  
  for (const campaign of campaigns) {
    await processCampaign(campaign.id);
  }
}, 5000);
```

Run as a separate process:
```bash
node worker.js
```

**Benefits:**
- ✅ Doesn't block web server
- ✅ Can be restarted independently
- ✅ Simpler than queue
- ❌ Still requires monitoring

#### Option C: Cron Job / Scheduled Task
Create a cron job that checks for stuck campaigns:

```typescript
// pages/api/cron/resume-campaigns.ts
export async function GET(req: NextRequest) {
  // Verify cron secret
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find stuck campaigns
  const campaigns = await prisma.whatsAppCampaign.findMany({
    where: { status: 'sending' }
  });

  // Resume each one
  for (const campaign of campaigns) {
    processCampaignInBackground(campaign.id);
  }

  return NextResponse.json({ resumed: campaigns.length });
}
```

Setup cron (Vercel, GitHub Actions, etc.):
```yaml
# .github/workflows/resume-campaigns.yml
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes

jobs:
  resume:
    runs-on: ubuntu-latest
    steps:
      - name: Resume campaigns
        run: |
          curl -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://admin.aagamholidays.com/api/cron/resume-campaigns
```

**Benefits:**
- ✅ Automatically resumes stuck campaigns
- ✅ No infrastructure changes needed
- ❌ 5-minute delay before resume
- ❌ Requires external cron service

## Implementation Priority

For your use case, I recommend:

### Short Term (Now)
1. **Resume the current campaign** using Option 1 or 2 above
2. **Monitor the campaign** until completion
3. **Don't restart the server** while campaigns are running

### Medium Term (This Week)
Implement **Option C (Cron Job)**:
- Quick to implement
- No new infrastructure
- Automatically handles future issues
- Good enough for moderate volume

### Long Term (Next Month)
Implement **Option A (Bull Queue)**:
- Most robust solution
- Best for high volume
- Production-grade reliability
- Requires Redis (can use Railway, Upstash, etc.)

## Monitoring Campaigns

### Check Campaign Status
```bash
node scripts/whatsapp/check-campaign-status.js
```

### Resume Stuck Campaigns
```bash
node scripts/whatsapp/resume-campaigns.js
```

### Watch Logs
```bash
# In your deployment platform (Vercel, Railway, etc.)
tail -f logs/app.log
```

## Prevention

Until a proper queue is implemented:

1. **Don't restart the server** during campaign sending
2. **Monitor campaigns** regularly
3. **Use smaller batches** (100-200 recipients per campaign)
4. **Test first** with a small campaign before large sends
5. **Have the resume script ready** if something goes wrong

## Summary

**Problem**: Campaign background process stopped when server restarted
**Impact**: 662 messages stuck in pending state
**Fix**: Pause and resume the campaign from UI or API
**Long-term**: Implement Bull queue or cron-based recovery system

---

## Quick Commands

```bash
# Check status
node scripts/whatsapp/check-campaign-status.js

# Resume campaigns
node scripts/whatsapp/resume-campaigns.js

# Or restart via API
curl -X POST https://admin.aagamholidays.com/api/whatsapp/campaigns/51f580d8-6ac9-4a3b-a9ce-e6bc333fea65/send
```
