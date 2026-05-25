---
name: schedule-report
description: Create a scheduled/cron task that generates and delivers a financial or operational report on a recurring basis. Bootstraps cron infrastructure if none exists.
disable-model-invocation: true
context: fork
agent: general-purpose
argument-hint: <report-type> [frequency]
---

# Schedule a Recurring Report

Create a scheduled/cron task for recurring report generation and delivery. This project has no cron infrastructure yet, so this skill bootstraps it.

**Leverages:** `anthropic-skills:schedule`

## Input

- **$0** — Report type (e.g., "daily-trips", "weekly-pl", "monthly-gst")
- **$1** — Frequency (optional: "daily", "weekly", "monthly", or cron expression)

## Live Project State

Existing cron routes:
```
!`find src/app/api/cron -name "*.ts" 2>/dev/null || echo "No cron routes found"`
```

Available report pages:
```
!`ls -d src/app/\(dashboard\)/reports/*/ 2>/dev/null`
```

## Steps

1. Ask the user which report to schedule, the frequency, and delivery method
2. Read the corresponding on-demand report page for data fetching logic
3. Create the cron API route at `src/app/api/cron/<task-name>/route.ts`:
   ```typescript
   import { NextResponse } from "next/server";
   import prismadb from "@/lib/prismadb";

   export const dynamic = "force-dynamic";

   export async function GET(req: Request) {
     const authHeader = req.headers.get("authorization");
     if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
       return new NextResponse("Unauthorized", { status: 401 });
     }
     try {
       // Data fetching + formatting + delivery
       return NextResponse.json({ success: true, data: result });
     } catch (error) {
       console.log("[CRON_TASK_NAME]", error);
       return new NextResponse("Internal error", { status: 500 });
     }
   }
   ```
4. Add `CRON_SECRET` to `.env.example` and document it
5. Suggest deployment config (Railway cron, Vercel cron, or external trigger)
6. If WhatsApp delivery: use existing WhatsApp send API pattern at `src/app/api/whatsapp/send/route.ts`
7. If email delivery: suggest adding Resend or Nodemailer
