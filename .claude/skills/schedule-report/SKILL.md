---
name: schedule-report
description: Create a scheduled/cron task that generates and delivers a financial or operational report on a recurring basis. Bootstraps cron infrastructure if none exists.
disable-model-invocation: true
context: fork
agent: general-purpose
argument-hint: <report-type> [frequency]
---

# Schedule a Recurring Report

Create a scheduled/cron task for recurring report generation and delivery.

**Leverages:** `anthropic-skills:schedule`

## Input

- **$0** — Report type (e.g., `daily-collection`, `weekly-pl`, `monthly-gst`)
- **$1** — Frequency (optional: `daily`, `weekly`, `monthly`, or cron expression)

## Live Project State

Existing cron routes:
```
!`find src/app/api/cron -name "*.ts" 2>/dev/null || echo "No cron routes yet"`
```

On-demand report pages:
```
!`ls -d src/app/\(dashboard\)/reports/*/ 2>/dev/null`
```

Existing scheduled jobs (scripts / internal):
```
!`grep -l "CRON_SECRET" src/app/api/**/*.ts scripts/*.ts 2>/dev/null | head -10`
```

## Steps

1. Confirm report type, schedule, and delivery (WhatsApp template, email, webhook, download-only)
2. Reuse data logic from the matching dashboard report or `src/app/api/report/` handler
3. Create `src/app/api/cron/<task-name>/route.ts`:
   - `export const dynamic = "force-dynamic"`
   - Authenticate with `Authorization: Bearer ${process.env.CRON_SECRET}` (see `CRON_SECRET` in `.env`)
   - Log errors as `console.log("[CRON_<TASK>]", error)`
4. Schedule via **Railway cron**, GitHub Actions, or another external scheduler
5. For WhatsApp delivery: follow patterns in `src/app/api/whatsapp/` and campaign worker
6. For Excel attachment: reuse `export-report-xlsx` patterns; for PDF use `generate-voucher-pdf` / Puppeteer pipeline
7. Document the cron URL and secret in project docs — never commit real secrets

## Notes

- Keep cron/API jobs within Railway timeout limits — split long work if needed
- Prefer idempotent cron handlers (safe if triggered twice)
