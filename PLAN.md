# Reusable Components Refactoring Plan

## Analysis Summary

The codebase has **200,950 lines** across all `.tsx`/`.ts` files in `src/`. There is massive duplication — the top 50 files alone account for ~60,000 lines, with many near-identical copies. This plan identifies **7 refactoring areas** that can eliminate ~7,000+ lines of duplicated code.

---

## Area 1: Financial Transaction Forms (~3,500 lines of duplication)

**Files involved (6 files, ~5,300 lines total):**
- `src/components/forms/sale-form-dialog.tsx` (886 lines)
- `src/components/forms/purchase-form-dialog.tsx` (888 lines)
- `src/components/forms/sale-return-form.tsx` (891 lines)
- `src/components/forms/purchase-return-form.tsx` (887 lines)
- `src/components/forms/payment-form-dialog.tsx` (884 lines)
- `src/components/forms/receipt-form-dialog.tsx` (882 lines)

**What's duplicated:**
- Identical imports (30+ lines per file)
- Nearly identical item schemas (productName, description, quantity, unitOfMeasure, pricePerUnit, taxSlab, taxAmount, totalAmount)
- Same date picker + calendar popover pattern (~40 lines each)
- Same searchable entity selector (customer/supplier) using Command+Popover (~60 lines each)
- Same line items table with add/remove/recalculate (~150 lines each)
- Same tax calculation logic
- Same form submission pattern with loading state, axios call, toast notification

**Reusable components to extract:**

### 1a. `src/components/forms/shared/DatePickerField.tsx` (~50 lines)
Wraps Calendar + Popover + FormField for date selection. Used in all 6 forms.

### 1b. `src/components/forms/shared/SearchableFormSelect.tsx` (~80 lines)
Searchable dropdown using Command+Popover for selecting customers/suppliers. Used in all 6 forms.

### 1c. `src/components/forms/shared/LineItemsTable.tsx` (~200 lines)
Reusable table for managing line items with add/remove rows, quantity/price fields, tax calculation, and totals. Used in sale, purchase, sale-return, purchase-return forms.

### 1d. `src/components/forms/shared/TransactionFormLayout.tsx` (~60 lines)
Common form wrapper with Card layout, error summary, loading state, submit button.

### 1e. `src/lib/transaction-schemas.ts` (~50 lines)
Shared Zod schemas for line items, with factory functions for sale/purchase variants.

**Estimated savings:** ~2,000 lines eliminated across the 6 files.

---

## Area 2: Tour Package Forms (~3,400 lines of duplication)

**Files involved (6 files, ~13,000 lines total):**
- `src/app/(dashboard)/tourPackages/[tourPackageId]/components/tourPackage-form_wysiwyg.tsx` (2,899 lines)
- `src/app/(dashboard)/tourPackages/[tourPackageId]/components/tourPackage-form-classic.tsx` (2,493 lines)
- `src/app/(dashboard)/tourPackageQueryFromTourPackage/.../tourPackageQueryFromTourPackage-form.tsx` (2,403 lines)
- `src/app/(dashboard)/tourPackageCreateCopy/.../tourPackageCreateCopy-form.tsx` (1,851 lines)
- `src/app/(dashboard)/tourPackageFromTourPackageQuery/.../tourPackageFromTourPackageQuery-form.tsx` (1,848 lines)
- `src/app/(dashboard)/tourPackageQuery/[tourPackageQueryId]/components/tourPackageQuery-form.tsx` (1,545 lines)

**What's duplicated:**
- Identical Zod schemas: `activitySchema`, `flightDetailsSchema`, `pricingItemSchema` (~100 lines each file)
- Identical helper functions: `parseJsonField()`, `parsePricingSection()` (~40 lines each file)
- Same form structure: error card, tabs, basic info fields, policies, pricing, submit button
- Same state management: `loading`, `flightDetails`, `useLocationDefaults`
- Same data transformation logic for initial data

**Reusable components to extract:**

### 2a. `src/components/tour-package/schemas.ts` (~120 lines)
Centralized Zod schemas: `activitySchema`, `itinerarySchema` (with optional room/transport), `flightDetailsSchema`, `pricingItemSchema`, `baseTourFormSchema`.

### 2b. `src/components/tour-package/form-helpers.ts` (~80 lines)
Shared helpers: `parseJsonField()`, `parsePricingSection()`, `transformInitialData()`, `reindexItineraries()`.

### 2c. `src/components/tour-package/TourFormLayout.tsx` (~100 lines)
Common form wrapper: title/description header, error display card, delete confirmation modal, tab navigation shell, submit button.

### 2d. `src/components/tour-package/BasicInfoSection.tsx` (~120 lines)
Reusable section for: tour name, slug, type, category, location selector, date range, customer assignment.

### 2e. `src/components/tour-package/PolicySection.tsx` (~80 lines)
Reusable section wrapping all policy fields (cancellation, inclusions, exclusions, payment terms, etc.) with "use location defaults" toggle.

### 2f. `src/components/tour-package/FlightDetailsSection.tsx` (~100 lines)
Reusable flight management with add/remove flights, airline/number/departure/arrival fields.

**Estimated savings:** ~3,400 lines eliminated across the 6 files.

---

## Area 3: Pricing & Itinerary Tabs (~2,400 lines of duplication)

**Files involved (4 files, ~5,250 lines total):**
- `src/components/tour-package-query/PricingTab.tsx` (1,588 lines)
- `src/app/(dashboard)/(routes)/tourpackagequeryfrominquiry/associate/.../PricingTab.tsx` (1,647 lines)
- `src/components/tour-package-query/ItineraryTab.tsx` (947 lines)
- `src/app/(dashboard)/(routes)/tourpackagequeryfrominquiry/associate/.../ItineraryTab.tsx` (1,066 lines)

**What's duplicated:**
- The two PricingTab files are **95% identical** — same state (10 useState declarations), same useEffect hooks, same calculation UI, same API calls
- The two ItineraryTab files are **85% identical** — same `stripHtml()`, same drag-and-drop setup, same accordion structure, same editor management
- Associate versions add minor inquiry-specific logic

**Reusable components to extract:**

### 3a. `src/components/tour-package-query/hooks/usePricingTabState.ts` (~80 lines)
Extract all shared state and effects from PricingTab.

### 3b. `src/components/tour-package-query/PricingCalculationSection.tsx` (~200 lines)
Extract the auto-calculation UI block (markup selection, calculate button, API call, result display).

### 3c. Merge ItineraryTab using composition (~50 lines of config)
Add an optional `inquiry` prop to the main ItineraryTab to conditionally apply inquiry room allocations and transport details, eliminating the associate copy entirely.

### 3d. `src/lib/html-utils.ts` (~20 lines)
Extract `stripHtml()` utility used in multiple files.

**Estimated savings:** ~2,400 lines (associate PricingTab reduced to thin wrapper or eliminated; associate ItineraryTab eliminated entirely).

---

## Area 4: PDF Generators (~1,500 lines of duplication)

**Files involved (5 files, ~6,300 lines total):**
- `src/app/(dashboard)/tourPackageQueryPDFGenerator/.../tourPackageQueryPDFGenerator.tsx` (1,712 lines)
- `src/app/(dashboard)/tourPackageQueryPDFGeneratorWithVariants/.../tourPackageQueryPDFGeneratorWithVariants.tsx` (1,706 lines)
- `src/app/(dashboard)/tourPackagePDFGenerator/.../tourPackagePDFGenerator.tsx` (955 lines)
- `src/app/(dashboard)/tourPackagePDFGeneratorWithVariants/.../tourPackagePDFGeneratorWithVariants.tsx` (959 lines)
- `src/components/GenerateMyPDF.tsx` (941 lines)

**What's duplicated:**
- Identical company info config (~30 lines, 4 files)
- Identical brand color definitions (~50 lines, 4 files)
- Identical CSS style templates (~150 lines, 4 files)
- Identical PDF generation/download logic (~60 lines, 4 files)
- Identical text sanitization functions (~30 lines, 3+ files)
- Identical policy field parsing (~40 lines, 2+ files)

**Reusable components to extract:**

### 4a. `src/lib/pdf/company-config.ts` (~40 lines)
Company profiles (Aagam Holidays, etc.) with logos, addresses, social links.

### 4b. `src/lib/pdf/brand-theme.ts` (~70 lines)
Brand colors, gradients, and theme constants.

### 4c. `src/hooks/usePDFStyles.ts` (~130 lines)
Hook returning memoized CSS style strings (cardStyle, tableStyle, containerStyle, etc.).

### 4d. `src/hooks/usePDFGenerator.ts` (~50 lines)
Hook wrapping the PDF generation API call, blob download, and loading state.

### 4e. `src/lib/pdf/text-utils.ts` (~40 lines)
`sanitizeText()`, `extractText()`, `parsePolicyField()` utilities.

**Estimated savings:** ~1,500 lines eliminated across 5 files.

---

## Area 5: Variant Tabs (~900 lines of duplication)

**Files involved (2 files, ~4,580 lines total):**
- `src/components/tour-package-query/QueryVariantsTab.tsx` (2,495 lines)
- `src/components/tour-package-query/PackageVariantsTab.tsx` (2,084 lines)

**What's duplicated:**
- Same tab structure (Hotels → Rooms → Pricing sub-tabs per variant)
- Same hotel display patterns with images and selection
- Same room allocation display
- Same pricing breakdown table structure

**Reusable components to extract:**

### 5a. `src/components/tour-package-query/VariantHotelMapping.tsx` (~150 lines)
Display hotel info with image, name, change-hotel selector. Used in both tabs.

### 5b. `src/components/tour-package-query/VariantPricingDisplay.tsx` (~200 lines)
Pricing breakdown table showing seasonal pricing components. Used in both tabs.

### 5c. `src/components/tour-package-query/VariantTabLayout.tsx` (~100 lines)
Shared tab structure for switching between variants with Hotels/Rooms/Pricing sub-tabs.

**Estimated savings:** ~900 lines eliminated.

---

## Area 6: Data Table / List Pages (Pattern standardization)

**Files involved:** Many page files across modules follow similar patterns for data listing.

**Common pattern to extract:**

### 6a. `src/components/shared/DataPageLayout.tsx` (~80 lines)
Standard page layout: heading with action button, separator, data table with search.

This is lower priority since each module has unique columns, but the outer shell is repeated.

---

## Area 7: Searchable Combobox Pattern (Cross-cutting)

The Command+Popover searchable select pattern appears in 15+ files with near-identical code.

### 7a. `src/components/ui/searchable-select.tsx` (~100 lines)
Generic searchable select component:
```tsx
<SearchableSelect
  items={customers}
  value={selectedId}
  onChange={setSelectedId}
  labelKey="name"
  valueKey="id"
  placeholder="Select customer..."
  searchPlaceholder="Search customers..."
/>
```

**Estimated savings:** ~600 lines across 15+ files (40 lines per usage replaced by ~5 lines).

---

## Implementation Priority

| Priority | Area | Files Affected | Lines Saved | Risk |
|----------|------|---------------|-------------|------|
| 1 | Area 7: SearchableSelect | 15+ files | ~600 | Low |
| 2 | Area 1: Financial Forms | 6 files | ~2,000 | Low |
| 3 | Area 4: PDF Generators | 5 files | ~1,500 | Low |
| 4 | Area 3: Pricing/Itinerary Tabs | 4 files | ~2,400 | Medium |
| 5 | Area 2: Tour Package Forms | 6 files | ~3,400 | Medium |
| 6 | Area 5: Variant Tabs | 2 files | ~900 | Medium |
| 7 | Area 6: Data Page Layout | Many | ~400 | Low |

**Total estimated savings: ~11,200 lines (~5.5% of total codebase)**

---

## Implementation Approach

For each area, the approach is:
1. Create the new shared component/hook/utility file
2. Update ONE consuming file to use it, verify it works (`npm run build`)
3. Migrate remaining files one at a time
4. Run `npm run build` after each migration to catch regressions

No changes to API routes, database schema, or business logic — this is purely UI/form code extraction.
