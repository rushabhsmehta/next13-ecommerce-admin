# WhatsApp Campaign Cron (Railway)

Lightweight Railway cron service that triggers the admin app's campaign worker over HTTP.

## Railway service

- **Service:** `discerning-joy`
- **Schedule:** `*/5 * * * *` (every 5 minutes — Railway minimum)
- **Start command:** `sh run.sh`

## Required variables (on `discerning-joy`)

| Variable | Example |
|----------|---------|
| `WHATSAPP_WORKER_TOKEN` | Same value as `next13-ecommerce-admin` |
| `ADMIN_APP_URL` | `https://admin.aagamholidays.com` |

## Dashboard setting (important)

Set **Root Directory** to:

```
cron/whatsapp-campaign-worker
```

Otherwise GitHub auto-deploys from repo root will overwrite this cron setup.

## Manual deploy

```bash
railway up cron/whatsapp-campaign-worker --path-as-root -s discerning-joy -e production
```
