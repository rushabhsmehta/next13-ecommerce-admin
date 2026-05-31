---
name: new-voucher-page
description: Scaffold a complete financial voucher view page with print and PDF download capabilities, using VoucherLayout + VoucherActions pattern.
disable-model-invocation: true
context: fork
agent: general-purpose
argument-hint: <voucher-type>
---

# Scaffold a Voucher View Page

Create a complete financial voucher view page with print and PDF download.

**Leverages:** `anthropic-skills:pdf`

## Input

- **$0** — Voucher type: `sale | purchase | receipt | payment | income | expense | sale-return | purchase-return`

## Live Project State

Existing voucher pages:
```
!`find src/app/\(dashboard\) -path "*/voucher/page.tsx" 2>/dev/null`
```

Public PDF paths (proxy):
```
!`grep -n "voucher\|viewpdf" src/proxy.ts 2>/dev/null | head -15`
```

## Steps

1. Read `src/components/voucher-layout.tsx` and `src/components/voucher-actions.tsx`
2. Read Prisma model + includes; check for an existing voucher route
3. Create:
   - `src/app/(dashboard)/<type>s/[<type>Id]/voucher/page.tsx` — server: auth, `requireFinanceOrAdmin` if needed, Prisma fetch
   - `.../voucher/components/voucher-client.tsx` — client: map to `VoucherLayoutProps`, `VoucherActions`, line items as `children`
4. Set `data-pdf-footer-*` attributes from organization branding
5. Register path in `crm-route-access-rules.ts` if role-restricted
6. For PDF content changes, see `generate-voucher-pdf` skill

## Additional resources

- [generate-voucher-pdf references](../generate-voucher-pdf/references/voucher-components.md)
