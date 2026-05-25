---
name: new-voucher-page
description: Scaffold a complete financial voucher view page with print and PDF download capabilities, using VoucherLayout + VoucherActions pattern.
disable-model-invocation: true
context: fork
agent: general-purpose
argument-hint: <voucher-type>
---

# Scaffold a Voucher View Page

Create a complete financial voucher view page with print and PDF download capabilities.

**Leverages:** `anthropic-skills:pdf`

## Input

- **$0** — Voucher type: `sale | purchase | receipt | payment | income | expense | sale-return | purchase-return`

## Live Project State

Existing voucher pages:
```
!`find src/app/\(dashboard\) -path "*/voucher/page.tsx" 2>/dev/null`
```

VoucherLayout props:
```
!`grep -A 20 "interface VoucherLayoutProps" src/components/voucher-layout.tsx 2>/dev/null | head -25`
```

## Steps

1. Read `src/components/voucher-layout.tsx` for the component contract
2. Read `src/components/voucher-actions.tsx` for the PDF generation flow
3. Read the relevant Prisma model from `schema.prisma` to determine includes
4. Check if a voucher page already exists for this type
5. Create the route folder:
   - `src/app/(dashboard)/<type>s/[<type>Id]/voucher/page.tsx`
   - `src/app/(dashboard)/<type>s/[<type>Id]/voucher/components/voucher-client.tsx`
6. **Server component** (`page.tsx`): Auth check, Prisma fetch with includes, pass to client
7. **Client component** (`voucher-client.tsx`):
   - Map record data to `VoucherLayoutProps`
   - Set `data-pdf-footer-*` attributes from organization data
   - Render `VoucherActions` + `VoucherLayout` with line items table as `children`
   - Use `formatPrice()` for amounts, `format()` for dates

## Additional resources

- For voucher component contracts, see [references/voucher-components.md](references/voucher-components.md)
