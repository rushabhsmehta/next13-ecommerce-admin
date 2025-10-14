# WhatsApp Campaign API - Quick Reference

## 🚀 Quick Start

### 1. Create Campaign
```bash
curl -X POST http://localhost:3000/api/whatsapp/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Campaign",
    "templateName": "tour_package_marketing",
    "recipients": [
      {
        "phoneNumber": "+919978783238",
        "variables": {"1": "Bali", "2": "₹45000"}
      }
    ]
  }'
```

### 2. Send Campaign
```bash
curl -X POST http://localhost:3000/api/whatsapp/campaigns/{campaignId}/send
```

### 3. Check Stats
```bash
curl http://localhost:3000/api/whatsapp/campaigns/{campaignId}/stats
```

## 📋 All Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/whatsapp/campaigns` | List all campaigns |
| POST | `/api/whatsapp/campaigns` | Create campaign |
| GET | `/api/whatsapp/campaigns/{id}` | Get campaign details |
| PUT | `/api/whatsapp/campaigns/{id}` | Update campaign |
| DELETE | `/api/whatsapp/campaigns/{id}` | Delete/cancel campaign |
| POST | `/api/whatsapp/campaigns/{id}/send` | Start sending |
| GET | `/api/whatsapp/campaigns/{id}/stats` | Get analytics |
| GET | `/api/whatsapp/campaigns/{id}/recipients` | List recipients |
| POST | `/api/whatsapp/campaigns/{id}/recipients` | Add recipients |
| DELETE | `/api/whatsapp/campaigns/{id}/recipients?ids=...` | Remove recipients |

## 🎯 Campaign Statuses

| Status | Description |
|--------|-------------|
| `draft` | Created, not scheduled |
| `scheduled` | Scheduled for future |
| `sending` | Currently sending |
| `completed` | All sent |
| `cancelled` | User cancelled |
| `failed` | System error |

## 👥 Recipient Statuses

| Status | Description |
|--------|-------------|
| `pending` | Waiting to send |
| `sending` | Currently processing |
| `sent` | Sent to Meta |
| `delivered` | Delivered to customer |
| `read` | Customer read it |
| `failed` | Send failed |
| `opted_out` | User stopped marketing |
| `responded` | Customer replied |
| `retry` | Will retry later |

## ⚠️ Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 131049 | Per-user limit | Don't retry for 24h |
| 131050 | User stopped marketing | Mark opted_out |
| 131047 | 24h window expired | Use template |
| 131026 | Undeliverable | Retry 3x |
| 100 | Invalid template | Fix template |

## 📊 Example: Create Campaign with Multiple Recipients

```javascript
const campaign = {
  name: "Bali Summer Sale 2025",
  description: "50% off on Bali packages",
  templateName: "tour_package_marketing",
  templateLanguage: "en_US",
  
  // Default variables for all
  templateVariables: {
    "1": "Bali",
    "2": "₹45,000"
  },
  
  // Recipients with custom variables
  recipients: [
    {
      phoneNumber: "+919978783238",
      name: "John Doe",
      customerId: "cust_123",
      variables: {
        "1": "Bali Premium Package",
        "2": "₹50,000"
      }
    },
    {
      phoneNumber: "+911234567890",
      name: "Jane Smith",
      variables: {
        "1": "Bali Standard Package",
        "2": "₹35,000"
      }
    }
  ],
  
  // Settings
  rateLimit: 10,  // 10 messages per minute
  
  // Optional: Schedule for later
  scheduledFor: "2025-10-15T10:00:00Z"
};

// Create
const response = await fetch('/api/whatsapp/campaigns', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(campaign)
});

const { campaign: created } = await response.json();
console.log('Campaign ID:', created.id);

// Send immediately (if not scheduled)
await fetch(`/api/whatsapp/campaigns/${created.id}/send`, {
  method: 'POST'
});
```

## 📈 Example: Monitor Campaign Progress

```javascript
async function monitorCampaign(campaignId) {
  const interval = setInterval(async () => {
    const response = await fetch(`/api/whatsapp/campaigns/${campaignId}/stats`);
    const stats = await response.json();
    
    console.log(`Progress: ${stats.stats.sent}/${stats.stats.total} sent`);
    console.log(`Delivered: ${stats.stats.delivered}`);
    console.log(`Failed: ${stats.stats.failed}`);
    
    if (stats.campaign.status === 'completed') {
      console.log('Campaign completed!');
      console.log('Metrics:', stats.metrics);
      clearInterval(interval);
    }
  }, 5000); // Check every 5 seconds
}

monitorCampaign('your-campaign-id');
```

## 🔧 Troubleshooting

### Prisma Type Errors
```bash
# Regenerate Prisma client
npx prisma generate

# Restart dev server
npm run dev
```

### Check Campaign Status
```bash
# Get campaign details
curl http://localhost:3000/api/whatsapp/campaigns/{campaignId}

# Get failed recipients
curl "http://localhost:3000/api/whatsapp/campaigns/{campaignId}/recipients?status=failed"
```

### Retry Failed Recipients
```javascript
// Get failed recipients
const response = await fetch(
  `/api/whatsapp/campaigns/${campaignId}/recipients?status=failed`
);
const { recipients } = await response.json();

// Create new campaign with failed recipients
const retryResponse = await fetch('/api/whatsapp/campaigns', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Retry Campaign',
    templateName: originalCampaign.templateName,
    recipients: recipients.map(r => ({
      phoneNumber: r.phoneNumber,
      variables: r.variables
    }))
  })
});
```

## 📝 Testing Script

```bash
# Run the test script
node scripts/whatsapp/test-campaign-api.js
```

## 🎨 Rate Limiting Examples

| Rate Limit | Delay Between Messages | Time for 100 Messages |
|------------|------------------------|----------------------|
| 5/min | 12 seconds | 20 minutes |
| 10/min | 6 seconds | 10 minutes |
| 20/min | 3 seconds | 5 minutes |
| 30/min | 2 seconds | 3.3 minutes |
| 60/min | 1 second | 1.7 minutes |

**Recommendation:** Start with 10/min for safety

## 🔐 Best Practices

1. **Always test with 1-2 recipients first**
2. **Use approved templates only**
3. **Respect send windows (9 AM - 9 PM)**
4. **Monitor campaign stats in real-time**
5. **Handle opt-outs immediately**
6. **Keep retry count ≤ 3**
7. **Use meaningful campaign names**
8. **Track customerId for better analytics**

## 📞 Support

- Design Doc: `docs/WHATSAPP_CAMPAIGNS_AND_CATALOG_DESIGN.md`
- Implementation Summary: `docs/CAMPAIGN_IMPLEMENTATION_SUMMARY.md`
- Meta Docs: https://developers.facebook.com/docs/whatsapp/cloud-api

---

**Ready to send your first campaign! 🚀**
