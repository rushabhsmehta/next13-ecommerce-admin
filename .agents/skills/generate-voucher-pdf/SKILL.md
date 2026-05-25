---
name: generate-voucher-pdf
description: Generate a downloadable PDF voucher (receipt, payment, sale, purchase, income, expense) using the project's branding system and Puppeteer pipeline. Use when the user asks to create or modify PDF vouchers.
context: fork
agent: general-purpose
argument-hint: <voucher-type> [transaction-id]
---

# Generate Voucher PDF

Generate a downloadable PDF voucher for any financial transaction using the project's branding system and Puppeteer-based PDF pipeline.

**Leverages:** `anthropic-skills:pdf`

## Input

- **$0** — Voucher type: `sale | purchase | receipt | payment | income | expense | sale-return | purchase-return`
- **$1** — Transaction ID or description (optional)

## Live Project State

Current branding profiles:
```
!`grep -A 3 "companyInfo" src/lib/pdf/branding.ts | head -10`
```

VoucherLayout props interface:
```
!`grep -A 20 "interface VoucherLayoutProps" src/components/voucher-layout.tsx 2>/dev/null || grep -A 20 "VoucherLayoutProps" src/components/voucher-layout.tsx | head -25`
```

Existing voucher types:
```
!`grep -o "type.*VoucherType" src/components/voucher-layout.tsx | head -5`
```

## Steps

1. Read the relevant financial model from `schema.prisma` for the voucher type
2. Read `src/components/voucher-layout.tsx` to understand the `VoucherLayoutProps` interface
3. Read `src/components/voucher-actions.tsx` to understand the HTML capture and PDF generation flow
4. Read `src/lib/pdf/branding.ts` for company info and brand colors
5. Generate the voucher following the `VoucherLayout` structure:
   - Organization header with logo and details
   - Voucher title, number, and date
   - Left info panel (customer/supplier details) + Right info panel (account/method details)
   - Line items table as `children`
   - Total amount, notes, and signature blocks
6. Ensure all currency values use `formatPrice()` from `@/lib/utils`
7. Ensure dates use `format()` from `date-fns`

## Additional resources

- For branding details, see [references/branding.md](references/branding.md)
- For voucher component contracts, see [references/voucher-components.md](references/voucher-components.md)
