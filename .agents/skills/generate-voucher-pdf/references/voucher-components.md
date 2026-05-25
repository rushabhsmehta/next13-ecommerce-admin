# Voucher Component Reference

## VoucherLayout (src/components/voucher-layout.tsx)

### Props Interface
```typescript
interface VoucherLayoutProps {
  title: string;                    // e.g., "Sale Invoice", "Payment Voucher"
  subtitle?: string;                // e.g., "Tax Invoice under GST"
  voucherNo: string;                // e.g., "INV-2024-001"
  date: string;                     // Formatted date string
  dueDate?: string;
  leftInfo: { label: string; content: string }[];   // Customer/supplier details
  rightInfo: { label: string; content: string }[];  // Account/method details
  additionalNotes?: string;
  signatures?: string[];            // Signature line labels
  totalAmount?: string;             // Formatted with formatPrice()
  type: VoucherType;
  organization?: {
    name: string;
    logo?: string;
    address?: string;
    phone?: string;
    email?: string;
    gstin?: string;
    pan?: string;
  };
  children?: React.ReactNode;       // Line items table
}
```

### VoucherType Enum
```
"sale" | "purchase" | "receipt" | "payment" | "income" | "expense" | "sale-return" | "purchase-return" | "tour-package-query"
```

## VoucherActions (src/components/voucher-actions.tsx)

### Props
```typescript
{ id: string; type: VoucherType }
```

### How it works
1. Captures `#voucher-content` DOM element
2. `buildVoucherHtml(element)` → creates full HTML document with styles
3. `makeAssetUrlsAbsolute(root)` → converts relative URLs to absolute
4. `collectHeadMarkup()` → collects stylesheets, fonts from document head
5. `buildHeaderHtml()` → orange-themed page header with page numbers
6. `buildFooterHtml()` → company logo + contact info footer
7. POSTs to `/api/generate-pdf` with `{ htmlContent, headerHtml, footerHtml }`
8. Downloads the returned PDF blob

### Data-PDF Footer Attributes
Set on the `#voucher-content` wrapper div:
- `data-pdf-footer-label` — Company name
- `data-pdf-footer-primary` — Phone number
- `data-pdf-footer-secondary` — Email
- `data-pdf-footer-website` — Website URL
- `data-pdf-footer-logo` — Logo image URL
- `data-pdf-footer-tagline` — Company tagline

## Branding (src/lib/pdf/branding.ts)

### Company Profiles
- `"Empty"` — Blank profile
- `"AH"` — Aagam Holidays (default)

### Brand Colors
```
primary: #DC2626 (red)
secondary: #EA580C (orange)
accent: #F97316
background: #FFF7ED
text: #1C1917
```

### Key Exports
- `companyInfo` — Profile lookup
- `brandColors` — Color palette
- `brandGradients` — CSS gradient strings
- `resolveCompanyInfo(profile)` — Merge profile with defaults
