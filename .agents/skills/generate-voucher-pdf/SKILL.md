---
name: generate-voucher-pdf
description: Generate a downloadable PDF voucher (receipt, payment, sale, purchase, income, expense) using the project's branding system and Puppeteer pipeline. Use when the user asks to create or modify PDF vouchers.
context: fork
agent: general-purpose
argument-hint: <voucher-type> [transaction-id]
---

# Generate Voucher PDF

Generate a downloadable PDF voucher for any financial transaction.

**Leverages:** `anthropic-skills:pdf`

## Input

- **$0** — Voucher type: `sale | purchase | receipt | payment | income | expense | sale-return | purchase-return`
- **$1** — Transaction ID or description (optional)

## Live Project State

Branding:
```
!`head -30 src/lib/pdf/branding.ts 2>/dev/null`
```

Voucher components:
```
!`grep -A 15 "VoucherLayoutProps" src/components/voucher-layout.tsx 2>/dev/null | head -20`
```

PDF pipeline:
```
!`ls src/utils/generatepdf.ts src/lib/pdf/ 2>/dev/null`
```

## Steps

1. Read the Prisma model and relations for the voucher type
2. Read `src/components/voucher-layout.tsx` (`VoucherLayoutProps`) and `src/components/voucher-actions.tsx` (HTML capture → PDF)
3. Read `src/lib/pdf/branding.ts` and `src/lib/pdf/styles.ts`
4. Compose voucher: org header, title/number/date, info panels, line items table, totals, signatures
5. Use `formatPrice()` and `format()` / `formatSafeDate()` for display
6. **Production PDF:** `src/utils/generatepdf.ts` uses `@sparticuz/chromium-min` on Railway; use `inlineImagesInHtml()` for remote header/footer images in margin templates
7. **Automation:** Puppeteer/HeadlessChrome may call voucher routes with relaxed org RBAC via `isCrmPdfAutomationRequest()` in `src/lib/crm-route-access.ts` — user-facing routes still require normal auth

## Additional resources

- [references/voucher-components.md](references/voucher-components.md)
