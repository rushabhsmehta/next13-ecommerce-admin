# PDF Generation - Complete Documentation

> **Consolidated from**: PDF_WITH_VARIANTS_*.md, DOWNLOAD_PDF_WITH_VARIANTS_READY.md files

## Overview

Comprehensive PDF generation system for Tour Packages and Tour Package Queries with two modes:
1. **Standard PDF** - Basic tour package information
2. **PDF with Variants** - Complete tour package + all variant hotel configurations

## Table of Contents
- [Quick Start](#quick-start)
- [PDF with Variants](#pdf-with-variants)
- [Standard PDF](#standard-pdf)
- [Implementation Details](#implementation-details)
- [Menu Integration](#menu-integration)
- [Content Sections](#content-sections)

---

## Quick Start

### Accessing PDF Generation

#### Tour Package Query
**Location**: Tour Package Query list → Actions menu (⋮)

**Options**:
- Download PDF (standard)
- **Download PDF with Variants** → [Select Template]
  - Empty (no branding)
  - AH (Aagam Holidays - full footer)
  - KH (Kobawala Holidays)
  - MT (Mahavir Tour and Travels)

#### Tour Packages
**Location**: Tour Packages list → Actions menu (⋮)

**Options**:
- Download PDF (standard)
- **Download PDF with Variants** (AH template default)

---

## PDF with Variants

### ✅ Complete Implementation

**File Sizes**:
- Tour Package: **986 lines** (comprehensive)
- Tour Package Query: **1010 lines** (comprehensive + query-specific fields)

### All Sections Included

#### 1. Header Section (80 lines)
- Tour images with company logo overlay
- Tour name with gradient text
- Tour type badge (e.g., "Domestic Package")
- Company branding
- Prepared by information

**Example**:
```html
<div style="background: linear-gradient(135deg, #DC2626 0%, #EA580C 100%)">
  <h1>Dubai Adventure 5N/6D</h1>
  <span class="badge">International Package</span>
</div>
```

#### 2. Tour Information Section (60 lines)
- **Destination** (with location lookup from database)
- **Duration** (e.g., "5 Nights / 6 Days")
- **Travel Dates** (Tour Package Query only)
  - From: DD MMM, YYYY
  - To: DD MMM, YYYY
- **Transport Mode** (Flight/Train/Bus)
- **Pickup Location**
- **Drop Location**
- **Travelers**:
  - Number of adults
  - Number of children

**Display**:
```
┌─────────────────────────────────┐
│ DESTINATION: Dubai              │
│ DURATION: 5 Nights / 6 Days     │
│ FROM: 15 Dec, 2025 → TO: 20 Dec │
│ TRANSPORT: Flight               │
│ ADULTS: 2  |  CHILDREN: 1       │
└─────────────────────────────────┘
```

#### 3. Dynamic Pricing Section (70 lines)
Parses `pricingSection` JSON field and displays:
- Pricing component name
- Price amount (INR formatted)
- Description
- Alternating color cards
- GST notice footer

**Data Structure**:
```json
{
  "pricingSection": [
    {"name": "Hotel Accommodation", "price": "₹45,000", "description": "5 nights"},
    {"name": "Sightseeing", "price": "₹15,000", "description": "All major attractions"},
    {"name": "Meals", "price": "₹8,000", "description": "Breakfast + Dinner"}
  ]
}
```

#### 4. Total Price Section (40 lines)
- Large centered total cost
- INR formatting with Indian locale (₹1,50,000)
- Gradient accent bar
- GST indicator badge
- Professional styling

#### 5. Itinerary Section (150 lines)
Day-by-day itinerary with:
- **Circular day badges** (Day 1, Day 2, etc.)
- **Day titles** with gradient text
- **Day overview** (itineraryDescription)
- **Itinerary images** (max 3 per day)
- **Activities list**:
  - Numbered badges (1, 2, 3...)
  - Activity titles
  - Activity descriptions
  - Activity images
- Responsive grid layout

**Example Layout**:
```
┌────────────────────────────────────┐
│  ●  Day 1 - Arrival in Dubai       │
├────────────────────────────────────┤
│  Overview: Arrive at Dubai Airport │
│  and transfer to hotel...          │
│                                    │
│  [Image] [Image] [Image]          │
│                                    │
│  Activities:                       │
│  ① Airport Pickup                  │
│     Professional meet & greet...   │
│  ② Hotel Check-in                  │
│     5-star accommodation...        │
└────────────────────────────────────┘
```

#### 6. Package Variants Section (180 lines)
**ENHANCED from original**:
- Variant cards with gradient headers
- Variant names and descriptions
- **Price modifier badges**:
  - Green: Positive (+10%)
  - Orange: Negative (-5%)
  - Gray: Zero (0%)
- **Hotel grids per variant**:
  - Day number badges
  - Hotel images (with fallback placeholder)
  - Hotel names
  - Location/city labels
- Responsive grid: auto-fill, minmax(280px, 1fr)

**Example**:
```
┌─────────────────────────────────────┐
│ Budget Stay               -15%      │
├─────────────────────────────────────┤
│ 3-star hotels, great value          │
│                                     │
│ ┌─────┐ ┌─────┐ ┌─────┐            │
│ │ D1  │ │ D3  │ │ D5  │            │
│ │[IMG]│ │[IMG]│ │[IMG]│            │
│ │Hotel│ │Hotel│ │Hotel│            │
│ └─────┘ └─────┘ └─────┘            │
└─────────────────────────────────────┘
```

#### 7. Policies & Terms Section (200 lines)
**9 Policy Types** with unique color coding:

| Policy Type | Icon | Color Theme | Hex Code |
|-------------|------|-------------|----------|
| Inclusions | ✓ | Orange | #EA580C |
| Exclusions | ✗ | Red | #DC2626 |
| Important Notes | ⚠ | Yellow | #EAB308 |
| Payment Policy | 💳 | Green | #059669 |
| Kitchen Group Policy | 🍽️ | Purple | #7C3AED |
| Useful Tips | 💡 | Green | #10B981 |
| Cancellation Policy | 📅 | Pink | #EC4899 |
| Airline Cancellation | ✈️ | Blue | #3B82F6 |
| Terms & Conditions | 📋 | Gray | #6B7280 |

**Features**:
- 2-column responsive grid
- Professional card design with icons
- Bullet list rendering
- Fallback to location defaults
- Footer disclaimer note

---

### Enhanced Footer

#### AH Template (Full Footer)
- Company logo and name
- Complete contact information:
  - Address
  - Phone: +91-97244 44701
  - Email: info@aagamholidays.com
- **Social media links**:
  - Facebook
  - Instagram
  - Twitter
  - LinkedIn
  - YouTube
  - WhatsApp
- Website link with icon
- Page numbers: "Page X / Y"
- Tagline: "Making your dream destinations come true..."
- Gradient background (#fefaf6 → #fff5eb)

#### Other Templates (KH, MT, Empty)
- Basic company info (if available)
- Contact details
- Page numbers only

---

## Implementation Details

### Component Structure

**Tour Package**:
```
/tourPackagePDFGeneratorWithVariants/[tourPackageId]/
  ├── page.tsx                    # Data fetching with Prisma
  └── components/
      └── tourPackagePDFGeneratorWithVariants.tsx
```

**Tour Package Query**:
```
/tourPackageQueryPDFGeneratorWithVariants/[tourPackageQueryId]/
  ├── page.tsx                    # Data fetching + audit logs
  └── components/
      └── tourPackageQueryPDFGeneratorWithVariants.tsx
```

### Helper Functions

#### 1. Extract Text (Recursive)
```typescript
const extractText = useCallback((obj: any): string => {
  if (typeof obj === "string") return obj;
  if (Array.isArray(obj)) return obj.map(extractText).join("\\n");
  if (obj && typeof obj === "object") {
    return Object.values(obj).map(extractText).join("\\n");
  }
  return "";
}, []);
```

#### 2. Parse Policy Field
```typescript
const parsePolicyField = useCallback((field: any): string[] => {
  if (!field) return [];
  if (Array.isArray(field)) return field.map(extractText).filter(Boolean);
  if (typeof field === "string") {
    try {
      const parsed = JSON.parse(field);
      return Array.isArray(parsed) ? parsed : [field];
    } catch {
      return [field];
    }
  }
  return [extractText(field)];
}, [extractText]);
```

#### 3. Format INR Currency
```typescript
const formatINR = (val: string | number): string => {
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(num);
};
```

#### 4. Parse Pricing Section
```typescript
const parsePricingSection = (pricingData: any): Array<{
  name: string;
  price: string;
  description?: string;
}> => {
  if (!pricingData) return [];
  if (typeof pricingData === "string") {
    try {
      return JSON.parse(pricingData);
    } catch {
      return [];
    }
  }
  return Array.isArray(pricingData) ? pricingData : [];
};
```

#### 5. Render Bullet List
```typescript
const renderBulletList = (items: string[]) => {
  return items.map(item => 
    `<li style="margin-bottom: 8px; line-height: 1.6;">${item}</li>`
  ).join('');
};
```

### Styling Architecture

**Brand Colors** (15 colors in useMemo):
```typescript
const brandColors = useMemo(() => ({
  primary: "#DC2626",
  secondary: "#EA580C",
  accent: "#F97316",
  light: "#FEF2F2",
  lightOrange: "#FFF7ED",
  text: "#1F2937",
  muted: "#6B7280",
  white: "#FFFFFF",
  border: "#E5E7EB",
  success: "#059669",
  panelBg: "#FFF8F5",
  subtlePanel: "#FFFDFB",
  tableHeaderBg: "#FFF3EC",
  slateText: "#374151",
  softDivider: "#F5E8E5",
}), []);
```

**Brand Gradients** (5 gradients):
```typescript
const brandGradients = useMemo(() => ({
  primary: "linear-gradient(135deg, #DC2626 0%, #EA580C 100%)",
  secondary: "linear-gradient(135deg, #EA580C 0%, #F97316 100%)",
  accent: "linear-gradient(135deg, #F97316 0%, #FB923C 100%)",
  light: "linear-gradient(135deg, #FEF2F2 0%, #FFF7ED 100%)",
  subtle: "linear-gradient(135deg, #FFFDFB 0%, #FFF8F5 100%)",
}), []);
```

**Print Optimization**:
```css
@media print {
  @page {
    size: A4;
    margin: 0;
  }
  body {
    margin: 0;
    padding: 20px;
  }
  .no-print-break {
    page-break-inside: avoid;
    break-inside: avoid;
  }
}
```

---

## Menu Integration

### Tour Package Query - Submenu Structure

```typescript
<DropdownMenuSub>
  <DropdownMenuSubTrigger>
    <FileText className="mr-2 h-4 w-4" />
    Download PDF with Variants
  </DropdownMenuSubTrigger>
  <DropdownMenuPortal>
    <DropdownMenuSubContent>
      <DropdownMenuItem onSelect={() => handlePDF('Empty')}>
        Empty
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => handlePDF('AH')}>
        AH
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => handlePDF('KH')}>
        KH
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => handlePDF('MT')}>
        MT
      </DropdownMenuItem>
    </DropdownMenuSubContent>
  </DropdownMenuPortal>
</DropdownMenuSub>
```

**Handler**:
```typescript
const handleOptionConfirmPDFWithVariants = (selectedOption: string) => {
  setMenuOpen(false);
  window.open(
    `/tourPackageQueryPDFGeneratorWithVariants/${data.id}?search=${selectedOption}`,
    "_blank"
  );
};
```

### Tour Packages - Direct Menu Item

```typescript
<DropdownMenuItem onClick={() => {
  setMenuOpen(false);
  router.push(`/tourPackagePDFGeneratorWithVariants/${data.id}?search=AH`);
}}>
  <FileText className="mr-2 h-4 w-4" />
  Download PDF with Variants
</DropdownMenuItem>
```

---

## Data Relations

### Required Prisma Includes

**Tour Package**:
```typescript
include: {
  images: true,
  flightDetails: true,
  itineraries: {
    include: {
      itineraryImages: true,
      activities: {
        include: {
          activityImages: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { dayNumber: 'asc' }
  },
  packageVariants: {
    include: {
      variantHotelMappings: {
        include: {
          itinerary: true, // Critical for dayNumber
          hotel: {
            include: {
              images: true,
              location: true,
            }
          }
        },
      },
    },
    orderBy: { createdAt: 'asc' }
  }
}
```

**Tour Package Query** (same + additional):
```typescript
// All Tour Package includes PLUS:
flightDetails: {
  include: { images: true }
},
itineraries: {
  // ... plus:
  roomAllocations: {
    include: {
      roomType: true,
      occupancyType: true,
      mealPlan: true,
    }
  },
  transportDetails: {
    include: {
      vehicleType: true,
    }
  }
},
associatePartner: true
```

---

## PDF Generation Flow

```
User clicks menu
  ↓
Opens route: /tourPackagePDFGeneratorWithVariants/[id]?search={template}
  ↓
page.tsx fetches data with expanded Prisma includes
  ↓
Component receives complete data
  ↓
buildHtmlContent() assembles all sections:
  - Header
  - Tour Info
  - Pricing
  - Total Price
  - Itinerary (with activities)
  - Variants (with hotels)
  - Policies (9 types)
  ↓
generatePDF() calls /api/generate-pdf:
  - HTML content
  - Footer HTML (conditional based on template)
  - Filename
  ↓
PDF downloads: TourPackageName_With_Variants.pdf
```

---

## Performance Optimizations

1. **useMemo** for brand colors and gradients (prevent recalculation)
2. **useCallback** for helper functions (prevent recreation)
3. Dependency arrays carefully managed
4. Image lazy loading in PDF
5. Print CSS optimization
6. Efficient data parsing (single pass)

---

## Testing Checklist

### Functional Tests
- [x] Tour Package Query menu displays 4 options
- [x] Tour Package menu displays direct option
- [x] Empty template generates PDF without branding
- [x] AH template shows full footer with social media
- [x] KH template shows basic footer
- [x] MT template shows basic footer
- [x] PDF filename uses tour package name

### Content Tests
- [x] Header section displays correctly
- [x] Tour information section shows all fields
- [x] Pricing section parses and displays pricing components
- [x] Total price displays with INR formatting
- [x] Itinerary section shows all days
- [x] Activities display under each day
- [x] Itinerary images display (max 3 per day)
- [x] Variants section shows all variants
- [x] Hotel grids display correctly
- [x] All 9 policy types display with correct colors
- [x] Bullet lists render correctly
- [x] Footer displays conditionally based on template
- [x] Page numbers work correctly

### Edge Cases
- [x] Missing data fields handled gracefully
- [x] Empty policy fields don't break layout
- [x] Missing images show fallback placeholder
- [x] No variants scenario handled
- [x] Location defaults work for policies
- [x] Long tour names wrap correctly
- [x] Many activities don't break layout

---

## Build Status

✅ **Build Successful**
```
✓ Creating an optimized production build
✓ Compiled successfully
✓ Linting and checking validity of types
```

**Warnings** (Non-Breaking):
- React Hook useCallback unnecessary dependency: 'hotels'
  - *Lint warning only, can be ignored*

---

## Troubleshooting

### Issue: PDF doesn't show all sections

**Solution**: Check page.tsx includes all necessary relations
- Verify initialData is not null
- Check browser console for errors
- Ensure Prisma includes are complete

### Issue: Images not displaying

**Solution**:
- Verify image URLs are accessible
- Check CORS headers on image server
- Fallback placeholder should show if image missing

### Issue: Policies showing as empty

**Solution**:
- Check policy fields in database
- Verify parsePolicyField() function
- Check location defaults are set

---

## Summary

### Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| File Size | ~500 lines | ~1000 lines |
| Content | Header + Variants | ALL sections |
| Policies | None | 9 policy types |
| Itinerary | Basic | Full with activities |
| Pricing | None | Dynamic breakdown |
| Footer | Basic | Full with social media |

### Status

✅ **PRODUCTION READY**

All features implemented, tested, and documented. PDF generation with variants is fully operational.

---

**Last Updated**: October 3, 2025  
**Version**: 2.0  
**Status**: Complete ✅
