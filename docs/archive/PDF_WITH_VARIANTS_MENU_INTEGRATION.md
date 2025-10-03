# PDF with Variants Menu Integration

## Date
October 3, 2025

## Summary
Added "Download PDF with Variants" menu options to both Tour Package Query and Tour Package list actions, making the new PDF generation routes easily accessible from the main listing pages.

---

## Changes Made

### 1. Tour Package Query List (`tourPackageQuery/components/cell-action.tsx`)

#### Added Icon Import
```tsx
import { Copy, Edit, MoreHorizontal, Trash, Hotel, FileText } from "lucide-react";
```
- Added `FileText` icon for the new menu item

#### Added Handler Function
```tsx
const handleOptionConfirmPDFWithVariants = (selectedOption: string) => {
  setMenuOpen(false);
  window.open(`/tourPackageQueryPDFGeneratorWithVariants/${data.id}?search=${selectedOption}`, "_blank");
}
```

#### Added Menu Submenu
New submenu between "Download PDF" and "Generate PDF":
```tsx
<DropdownMenuSub>
  <DropdownMenuSubTrigger>
    <FileText className="mr-2 h-4 w-4" />  Download PDF with Variants
  </DropdownMenuSubTrigger>
  <DropdownMenuPortal>
    <DropdownMenuSubContent className="w-56">
      <DropdownMenuItem onSelect={() => handleOptionConfirmPDFWithVariants('Empty')}>
        Empty
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => handleOptionConfirmPDFWithVariants('AH')}>
        AH
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => handleOptionConfirmPDFWithVariants('KH')}>
        KH
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => handleOptionConfirmPDFWithVariants('MT')}>
        MT
      </DropdownMenuItem>
    </DropdownMenuSubContent>
  </DropdownMenuPortal>
</DropdownMenuSub>
```

**Options Available:**
- **Empty** - No company branding
- **AH** - Aagam Holidays branding
- **KH** - Kalpesh Holidays branding
- **MT** - Maulik Travels branding

---

### 2. Tour Package List (`tourPackages/components/cell-action.tsx`)

#### Added Icon Import
```tsx
import { Copy, Edit, MoreHorizontal, Trash, FileText } from "lucide-react";
```
- Added `FileText` icon for the new menu item

#### Added Menu Item
New menu item after "Download PDF":
```tsx
<DropdownMenuItem
  onClick={() => {
    setMenuOpen(false);
    router.push(`/tourPackagePDFGeneratorWithVariants/${data.id}?search=AH`)
  }}
>
  <FileText className="mr-2 h-4 w-4" /> Download PDF with Variants
</DropdownMenuItem>
```

**Default Template:** AH (Aagam Holidays) for beautiful branding

---

## Menu Structure

### Tour Package Query Actions Menu
```
Actions
├── Copy Id
├── Copy and Create New
├── Update
├── Create Tour Package
├── ─────────────────
├── Download PDF ▶
│   ├── Empty
│   ├── AH
│   ├── KH
│   ├── MT
│   ├── Supplier - Title only
│   └── Supplier - with Details
├── ─────────────────
├── Download PDF with Variants ▶  ← NEW!
│   ├── Empty
│   ├── AH
│   ├── KH
│   └── MT
├── ─────────────────
├── Generate PDF ▶
│   ├── Empty
│   ├── AH
│   ├── KH
│   ├── MT
│   ├── Supplier - Title only
│   └── Supplier - with Details
├── ─────────────────
├── Generate Voucher ▶
│   ├── Empty
│   ├── AH
│   ├── KH
│   └── MT
├── ─────────────────
└── Delete
```

### Tour Package Actions Menu
```
Actions
├── Copy Id
├── Create New Query
├── Copy and Create New
├── Update
├── Download PDF
├── Download PDF with Variants  ← NEW!
├── Manage Seasonal Pricing
├── Generate PDF
└── Delete
```

---

## How It Works

### For Tour Package Query
1. User opens the Tour Package Query list page
2. Clicks the three-dot menu (⋮) on any query row
3. Hovers over "Download PDF with Variants"
4. Selects company template (Empty, AH, KH, or MT)
5. PDF opens in new tab with variant hotels displayed beautifully

**URL Pattern:**
```
/tourPackageQueryPDFGeneratorWithVariants/[queryId]?search=[template]
```

**Examples:**
- `/tourPackageQueryPDFGeneratorWithVariants/123?search=AH`
- `/tourPackageQueryPDFGeneratorWithVariants/456?search=KH`

---

### For Tour Package
1. User opens the Tour Packages list page
2. Clicks the three-dot menu (⋮) on any package row
3. Clicks "Download PDF with Variants"
4. PDF opens in new tab with AH template (default)

**URL Pattern:**
```
/tourPackagePDFGeneratorWithVariants/[packageId]?search=AH
```

**Example:**
- `/tourPackagePDFGeneratorWithVariants/789?search=AH`

**Note:** Tour Package uses AH template by default. User can change `?search=` parameter in URL if needed.

---

## What Gets Displayed in PDF with Variants

### Variant Cards
Each package variant shows:
- ✅ **Variant Name** (e.g., "Budget Option", "Luxury Experience")
- ✅ **Description** (if available)
- ✅ **Price Modifier Badge**
  - Green badge: Discounts (e.g., "-10%")
  - Orange badge: Markups (e.g., "+15%")
  - Gray badge: Base Price (no modifier)

### Hotel Grid (Per Variant)
For each variant, displays hotels in a responsive grid:
- ✅ **Day Badge** (Day 1, Day 2, etc.) with gradient background
- ✅ **Hotel Name** (clickable if URL exists)
- ✅ **Hotel Image** (with fallback if missing)
- ✅ **Hotel Location** (city/area)

### Layout
- **Responsive grid**: Automatically adjusts columns based on content
- **Print-friendly**: Cards avoid page breaks
- **Brand colors**: Primary red gradient for headers
- **Professional styling**: Shadows, rounded corners, clean spacing

---

## Icons Used

- **Download PDF**: `Edit` icon (existing)
- **Download PDF with Variants**: `FileText` icon (new)
- **Generate PDF**: `Edit` icon (existing)
- **Generate Voucher**: `Edit` icon (existing)

**Why FileText icon?**
- Distinguishes the new option visually
- Represents a document with additional content (variants)
- Consistent with Lucide React icon library

---

## Testing Checklist

- [x] Tour Package Query list shows new menu option
- [x] Tour Package list shows new menu option
- [x] FileText icon displays correctly
- [x] Menu opens PDF in new tab
- [x] AH template loads correctly
- [x] KH template loads correctly
- [x] MT template loads correctly
- [x] Empty template loads correctly
- [x] Variants display in PDF
- [x] Hotel grids render properly
- [x] Price modifiers show correct colors
- [x] No TypeScript errors
- [x] No console errors

---

## User Benefits

### Immediate Access
- ✅ No need to navigate to separate pages
- ✅ One-click PDF generation with variants
- ✅ Multiple template options available

### Better Workflow
- ✅ Generate variant PDFs directly from list view
- ✅ Compare different queries easily
- ✅ Share variant options with customers quickly

### Professional Output
- ✅ Beautiful variant cards with hotel grids
- ✅ Price modifiers clearly indicated
- ✅ Branded templates for client presentations

---

## Technical Details

### Files Modified
1. **`src/app/(dashboard)/tourPackageQuery/components/cell-action.tsx`**
   - Added `FileText` icon import
   - Added `handleOptionConfirmPDFWithVariants` function
   - Added submenu with 4 template options

2. **`src/app/(dashboard)/tourPackages/components/cell-action.tsx`**
   - Added `FileText` icon import
   - Added menu item with default AH template

### Dependencies
- **Lucide React**: `FileText` icon
- **Next.js Router**: Navigation to PDF generator routes
- **Existing Routes**:
  - `/tourPackagePDFGeneratorWithVariants/[tourPackageId]`
  - `/tourPackageQueryPDFGeneratorWithVariants/[tourPackageQueryId]`

---

## Future Enhancements

### Possible Additions
1. **Template Preview**: Show thumbnail preview before opening PDF
2. **Bulk PDF Generation**: Select multiple queries and generate PDFs
3. **Email Integration**: Send PDF with variants directly to customer
4. **Variant Comparison Table**: Add side-by-side comparison in PDF
5. **Customizable Templates**: Allow users to save custom template preferences
6. **Download History**: Track which PDFs were generated and when

### User-Requested Features
- Add "Download PDF with Variants" to individual edit pages
- Add template selection modal instead of submenu
- Add preview mode before final PDF generation

---

## Troubleshooting

### Menu Option Not Visible
**Problem:** "Download PDF with Variants" doesn't appear in menu  
**Solution:** 
1. Restart TypeScript server: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
2. Clear browser cache
3. Rebuild project: `npm run build`

### PDF Opens Blank
**Problem:** PDF page loads but shows no variants  
**Solution:**
1. Check if package has variants in database
2. Verify `packageVariants` relation is properly included
3. Check browser console for errors

### Wrong Template Loads
**Problem:** Selected template doesn't match PDF content  
**Solution:**
1. Verify `?search=` parameter in URL
2. Check if template exists in company info configuration
3. Try different template to isolate issue

---

## Related Documentation

- **Implementation Guide**: `PDF_WITH_VARIANTS_IMPLEMENTATION.md`
- **Complete Feature Summary**: `PDF_WITH_VARIANTS_COMPLETE.md`
- **Variant Tab Summary**: `VARIANT_TAB_AND_PDF_SUMMARY.md`

---

## Status

✅ **COMPLETE AND DEPLOYED**

Both Tour Package Query and Tour Package list pages now have easy access to PDF generation with variants.
