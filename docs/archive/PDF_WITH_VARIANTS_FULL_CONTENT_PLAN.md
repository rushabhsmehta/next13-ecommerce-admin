# PDF with Variants - Full Content Implementation Plan

## Overview

Currently, the PDF with Variants components only show:
- Header (tour name, logo)
- Package Variants Section (variant cards with hotels)
- Simple footer note

**User Request:** Add ALL components from the regular PDF generators to show complete tour package information.

---

## Sections to Copy

### From `tourPackageQueryPDFGenerator.tsx` (1427 lines)

The following sections need to be copied and integrated:

### 1. ✅ Already Present
- [x] Header Section (tour name, images, company logo)
- [x] Variants Section (custom implementation)

### 2. 📋 Need to Add - Customer & Tour Info

#### Customer Section
- Query Number
- Prepared By (from audit logs)
- Customer Name & Number
- Associate Partner Info
- Suppressed for Supplier views (SupplierA/SupplierB)

#### Tour Information Section  
- Destination
- Duration (number of days/nights)
- Travel Dates (start and end)
- Transport mode
- Pickup/Drop locations
- Number of travellers (adults, children)

### 3. 💰 Need to Add - Pricing

#### Dynamic Pricing Section
- Parse `pricingSection` JSON field
- Display pricing components in cards
- Show name, price, description
- Alternating background colors
- GST notice

#### Total Price Section
- Large centered total cost
- Formatted in INR (₹)
- GST indication
- Gradient accent bar

### 4. 📝 Need to Add - Remarks & Notes

#### Remarks Section
- Important notes from tour package
- Highlighted with left border accent
- Panel background

### 5. 🏨 Need to Add - Hotel & Accommodation

#### Hotel Summary Section
- Day-by-day hotel display
- Hotel images (with fallback)
- Hotel name (clickable link)
- Location/destination
- **Room Allocations Table:**
  - Room type (with custom override)
  - Occupancy type
  - Quantity
  - Voucher number
  - Sorted by occupancy display order
  - Meal plan indicator

#### Transport Details
- Vehicle type
- Quantity
- Description
- Per-day transport shown with hotel section

### 6. 🗺️ Need to Add - Itinerary

#### Itinerary Section
- **Section Header** (centered, "Travel Itinerary")
- **Per-Day Cards:**
  - Day number badge (circular)
  - Day title with gradient
  - Itinerary title
  - **Day Overview** (itineraryDescription)
  - **Itinerary Images** (grid, max 3 per day)
  - **Planned Activities:**
    - Activity number badge
    - Activity title
    - Activity description

#### Supplier View (SupplierA/SupplierB)
- Simplified table format
- Day number + description only
- No images or detailed activities

### 7. 📜 Need to Add - Policies & Terms

#### Comprehensive Policies Section
Large section with **2-column grid layout** containing:

**Row 1: Inclusions & Exclusions**
- ✓ Inclusions (orange theme)
- ✗ Exclusions (red theme)

**Row 2: Kitchen & Tips**
- 🍽️ Kitchen Group Policy (purple theme)
- 💡 Useful Tips (green theme)

**Row 3: Important & Payment**
- ⚠ Important Notes (yellow theme)
- 💳 Payment Policy (green theme)

**Row 4: Cancellation Policies**
- 📅 Cancellation Policy (pink theme)
- ✈️ Airline Cancellation Policy (blue theme)

**Row 5: Terms (Full Width)**
- 📋 Terms and Conditions (gray theme)

Each section has:
- Gradient header with icon
- Bullet list formatting
- Border-left accent
- Page-break-avoid
- Footer note: "Policies subject to change"

#### Policy Parsing Logic
- Parse JSON arrays
- Fall back to location defaults
- Handle legacy string format
- Bullet point rendering
- Text extraction from objects

### 8. 🎨 Styling Components

#### Brand Colors (useMemo)
```typescript
primary: "#DC2626"
secondary: "#EA580C"
accent: "#F97316"
light: "#FEF2F2"
lightOrange: "#FFF7ED"
text: "#1F2937"
muted: "#6B7280"
white: "#FFFFFF"
border: "#E5E7EB"
success: "#059669"
// + 5 more unified colors
```

#### Brand Gradients (useMemo)
```typescript
primary: linear-gradient(135deg, primary → secondary)
secondary: linear-gradient(135deg, secondary → accent)
light: linear-gradient(135deg, light → lightOrange)
subtle: linear-gradient(135deg, white → lightOrange)
accent: linear-gradient(135deg, lightOrange → light)
```

#### Shared Styles (useMemo)
- containerStyle
- cardStyle
- headerStyleAlt
- contentStyle
- sectionTitleStyle
- priceCardStyle
- pageStyle (with @media print)
- itineraryHeaderStyle
- tableStyle / tableHeaderStyle / tableCellStyle
- badgeStyle / iconStyle
- pageBreakBefore

### 9. 🔧 Helper Functions

#### parsePolicyField (useCallback)
- Extract text from policy objects
- Parse JSON arrays
- Split string by bullets/newlines
- Handle nested objects

#### formatINR
- Format numbers to Indian locale
- Handle invalid inputs

#### parsePricingSection
- Parse pricingSection JSON
- Handle array/string/object formats
- Extract pricing items

#### renderPolicyContent
- Render policy data as HTML
- Handle JSON and string formats
- Bullet list formatting

#### renderBulletList
- Create bullet list HTML
- Orange bullets
- Proper spacing

### 10. ⚡ Advanced Features

#### Fetch Prepared By Info
```typescript
useEffect(() => {
  // Fetch audit logs
  // Get CREATE action
  // Extract userName, userEmail
  // Set preparedBy state
}, [initialData]);
```

#### Auto-Generate PDF
```typescript
useEffect(() => {
  if (!initialData) return;
  generatePDF();
}, [initialData, generatePDF]);
```

#### Enhanced Footer
- Company logo and name
- Contact information (address, phone, email)
- Social media links (Facebook, Instagram, Twitter)
- Website URL
- Page numbers with custom footer HTML
- Gradient background
- Conditional display based on selectedOption

---

## Integration Strategy

### Step 1: Copy Imports & Types
1. Add all Prisma type imports
2. Add `AssociatePartner`, `RoomAllocation`, `TransportDetail`
3. Add `format` from date-fns
4. Update interface to include all relations

### Step 2: Copy State & Hooks
1. Add `preparedBy` state
2. Add all `useMemo` hooks for colors, gradients, styles
3. Add all `useCallback` hooks for helpers

### Step 3: Copy Helper Functions
1. `parsePolicyField`
2. `formatINR`
3. `parsePricingSection`
4. `renderPolicyContent`
5. `renderBulletList`
6. `extractText`
7. `parsePricingSection`

### Step 4: Update buildHtmlContent
1. Add all new sections
2. Insert **after** header
3. Insert variants section at appropriate place
4. Add all policies at end
5. Update return HTML structure

### Step 5: Update Page.tsx
1. Add all missing relations to Prisma include
2. Add roomAllocations, transportDetails
3. Add associatePartner
4. Add audit log fetching

### Step 6: Enhanced Footer
1. Copy footer HTML builder
2. Update API call to include footerHtml
3. Add margin configuration

---

## Recommended Insertion Order

```html
<html>
  <head>
    <style>...</style>
  </head>
  <body>
    <div container>
      1. Header Section
      2. Customer Section ← NEW
      3. Tour Information Section ← NEW  
      4. Dynamic Pricing Section ← NEW
      5. Total Price Section ← NEW
      6. Remarks Section ← NEW
      7. Hotel Summary Section ← NEW
      8. Package Variants Section ✓ (EXISTING - keep as is)
      9. Itinerary Section ← NEW
      10. Policies & Terms Section ← NEW
    </div>
  </body>
</html>
```

---

## File Sizes After Implementation

**Current:**
- tourPackagePDFGeneratorWithVariants.tsx: 509 lines
- tourPackageQueryPDFGeneratorWithVariants.tsx: 561 lines

**After Adding All Sections:**
- tourPackagePDFGeneratorWithVariants.tsx: ~1400 lines
- tourPackageQueryPDFGeneratorWithVariants.tsx: ~1500 lines

---

## Testing Checklist

After implementation:
- [ ] Header displays correctly
- [ ] Customer info shows (not for Supplier views)
- [ ] Tour information complete
- [ ] Pricing section displays
- [ ] Total price formatted correctly
- [ ] Remarks show if present
- [ ] Hotel summary with images
- [ ] Room allocations table
- [ ] Transport details per day
- [ ] Variants section intact
- [ ] Itinerary with images
- [ ] Activities display
- [ ] All policy sections present
- [ ] Footer with company info
- [ ] Social media links (AH only)
- [ ] Page numbers working
- [ ] PDF downloads successfully
- [ ] All company templates work (Empty, AH, KH, MT)

---

## Breaking Changes

### Page.tsx Includes
Must add to Prisma query:
```typescript
itineraries: {
  include: {
    itineraryImages: true,
    activities: {
      include: {
        activityImages: true
      }
    },
    roomAllocations: {
      include: {
        roomType: true,
        occupancyType: true,
        mealPlan: true
      }
    },
    transportDetails: {
      include: {
        vehicleType: true
      }
    }
  },
  orderBy: { dayNumber: 'asc' }
},
associatePartner: true,
```

### Component Props Interface
Must update to include:
```typescript
associatePartner: AssociatePartner | null;
itineraries: (Itinerary & {
  roomAllocations?: RoomAllocation[];
  transportDetails?: TransportDetail[];
})[];
```

---

## Implementation Time Estimate

- **Small chunks:** 2-3 hours per component file
- **Full implementation:** 6-8 hours total
- **Testing:** 1-2 hours
- **Total:** 8-10 hours

---

## Alternative: Simpler Approach

If full implementation is too complex, consider:

1. **Keep variants section as highlight**
2. **Add only essential sections:**
   - Tour Information
   - Total Price
   - Hotel Summary (without room allocations)
   - Basic Itinerary (titles only)
   - Inclusions/Exclusions only

This would be ~800 lines instead of ~1400 lines.

---

## Next Steps

**Option A: Full Implementation**
I can implement all sections step by step, creating updated component files.

**Option B: Simpler Version**
I can implement just the essential sections mentioned above.

**Option C: Documentation Only**
You can use this document as a guide to implement yourself.

**Which option would you prefer?**

---

Created: October 3, 2025
Status: Planning Document - Awaiting User Decision
