# PDF Generator with Package Variants - Implementation Guide

## Overview

Created new PDF generator routes that display **Package Variants** with their **variant-specific hotel mappings** in a beautiful, organized manner.

## Routes Created

### 1. Tour Package PDF with Variants
- **Route**: `/tourPackagePDFGeneratorWithVariants/[tourPackageId]`
- **Files Created**:
  - `layout.tsx` - Layout wrapper
  - `[tourPackageId]/loading.tsx` - Loading state
  - `[tourPackageId]/page.tsx` - Server component (fetches data with variants)
  - `[tourPackageId]/components/tourPackagePDFGeneratorWithVariants.tsx` - PDF generator component

### 2. Tour Package Query PDF with Variants
- **Route**: `/tourPackageQueryPDFGeneratorWithVariants/[tourPackageQueryId]`
- **Files Created**:
  - `layout.tsx` - Layout wrapper
  - `[tourPackageQueryId]/loading.tsx` - Loading state
  - `[tourPackageQueryId]/page.tsx` - Server component (fetches data with variants)
  - `[tourPackageQueryId]/components/tourPackageQueryPDFGeneratorWithVariants.tsx` - PDF generator component

## Key Features

### Variant Display Section
The PDF includes a beautifully designed **Package Variants** section that shows:

1. **Variant Header Card**
   - Variant name with badge
   - Description (if available)
   - Price modifier indicator (+/-/base)

2. **Day-by-Day Hotel Mappings**
   - Organized by day number
   - Shows variant-specific hotel for each day
   - Hotel image thumbnail
   - Hotel name and destination
   - Beautifully styled cards with gradients

3. **Visual Highlights**
   - Color-coded price modifiers (green for discounts, orange for premiums)
   - Day badges with gradient backgrounds
   - Responsive grid layout
   - Professional card-based design

### Design Elements

```html
<!-- Variant Section Structure -->
<div style="Variant Container">
  <h2>Package Variants & Hotel Options</h2>
  
  <for each variant>
    <div style="Variant Card">
      <!-- Variant Header -->
      <div style="Variant Header with Badge">
        Variant Name + Price Modifier Badge
      </div>
      
      <!-- Hotel Mappings Grid -->
      <div style="Grid Layout">
        <for each day with hotel>
          <div style="Day Card">
            <Day Badge>
            <Hotel Image>
            <Hotel Name & Location>
          </div>
        </for>
      </div>
    </div>
  </for>
</div>
```

## Data Structure

### Package Variants Schema
```typescript
{
  id: string,
  name: string,
  description: string | null,
  priceModifier: number | null,
  hotelMappings: HotelMapping[] | Record<string, string>
}
```

### Hotel Mapping Format
```typescript
// Stored as key-value pairs
{
  "1": "hotel_id_day_1",  // Day 1 hotel
  "2": "hotel_id_day_2",  // Day 2 hotel
  // ... etc
}
```

## Usage

### Accessing the PDF Routes

**For Tour Package:**
```
/tourPackagePDFGeneratorWithVariants/{tourPackageId}?search=AH
```

**For Tour Package Query:**
```
/tourPackageQueryPDFGeneratorWithVariants/{tourPackageQueryId}?search=KH
```

Query Parameters:
- `search`: Company branding (AH, KH, MT, Empty)

### Integration Points

Add download buttons in your forms:

```tsx
// In Tour Package Form
<Button
  onClick={() => {
    window.open(
      `/tourPackagePDFGeneratorWithVariants/${tourPackageId}?search=AH`,
      '_blank'
    )
  }}
>
  <FileText className="h-4 w-4 mr-2" />
  Download PDF with Variants
</Button>

// In Tour Package Query Form
<Button
  onClick={() => {
    window.open(
      `/tourPackageQueryPDFGeneratorWithVariants/${tourPackageQueryId}?search=AH`,
      '_blank'
    )
  }}
>
  <FileText className="h-4 w-4 mr-2" />
  Download PDF with Variants
</Button>
```

## Visual Design Specifications

### Color Palette
- **Primary**: `#DC2626` (Red)
- **Secondary**: `#EA580C` (Orange)
- **Accent**: `#F97316` (Bright Orange)
- **Success**: `#059669` (Green - for discounts)
- **Background**: `#FFF8F5` (Soft warm)
- **Border**: `#E5E7EB` (Light gray)

### Typography
- **Variant Name**: 18px, Bold, Primary gradient
- **Day Badge**: 12px, Bold, White on Primary
- **Hotel Name**: 14px, Semi-bold
- **Description**: 12px, Muted color

### Spacing & Layout
- **Card Padding**: 16px
- **Grid Gap**: 16px
- **Border Radius**: 6-8px
- **Grid Columns**: Auto-fit, minmax(280px, 1fr)

## Database Queries

### Fetching Variants for Tour Package
```typescript
const tourPackage = await prismadb.tourPackage.findUnique({
  where: { id: params.tourPackageId },
  include: {
    images: true,
    flightDetails: true,
    itineraries: {
      include: {
        itineraryImages: true,
        activities: {
          include: { activityImages: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { dayNumber: 'asc' },
    },
    packageVariants: {
      include: {
        hotelMappings: true,
      },
      orderBy: { createdAt: 'asc' },
    }
  }
});
```

### Fetching Variants for Tour Package Query
```typescript
const tourPackageQuery = await prismadb.tourPackageQuery.findUnique({
  where: { id: params.tourPackageQueryId },
  include: {
    images: true,
    flightDetails: { include: { images: true } },
    itineraries: {
      include: {
        itineraryImages: true,
        roomAllocations: {
          include: {
            roomType: true,
            occupancyType: true,
            mealPlan: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        transportDetails: {
          include: { vehicleType: true },
          orderBy: { createdAt: 'asc' },
        },
        activities: {
          include: { activityImages: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { dayNumber: 'asc' },
    },
    associatePartner: true,
    packageVariants: {
      include: {
        hotelMappings: true,
      },
      orderBy: { createdAt: 'asc' },
    }
  }
});
```

## Variant Section HTML Template

```typescript
const buildVariantsSection = (variants: PackageVariant[], hotels: Hotel[]) => {
  if (!variants || variants.length === 0) return '';
  
  return `
    <div style="...">
      <h2>Package Variants & Hotel Options</h2>
      ${variants.map(variant => `
        <div style="variant-card">
          <div style="header">
            <h3>${variant.name}</h3>
            ${variant.priceModifier 
              ? `<span class="price-badge">${formatPriceModifier(variant.priceModifier)}</span>`
              : ''
            }
          </div>
          
          ${variant.description 
            ? `<p>${variant.description}</p>`
            : ''
          }
          
          <div style="grid">
            ${Object.entries(variant.hotelMappings || {}).map(([dayNum, hotelId]) => {
              const hotel = hotels.find(h => h.id === hotelId);
              return hotel ? `
                <div style="day-card">
                  <div class="day-badge">Day ${dayNum}</div>
                  <img src="${hotel.images[0]?.url}" />
                  <h4>${hotel.name}</h4>
                  <p>${hotel.destination?.name || hotel.location?.label}</p>
                </div>
              ` : '';
            }).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
};
```

## Testing Checklist

- [ ] Verify variants are fetched correctly from database
- [ ] Check hotel mappings display for each variant
- [ ] Validate price modifier formatting (+10%, -5%, etc.)
- [ ] Test with packages that have 0, 1, and multiple variants
- [ ] Verify hotel images load correctly
- [ ] Test PDF generation with all company branding options
- [ ] Validate responsive layout in PDF
- [ ] Check page breaks don't split variant cards
- [ ] Test with missing hotel data (deleted hotels)
- [ ] Verify gradient backgrounds render correctly in PDF

## Common Issues & Solutions

### Issue: Hotel Mappings Not Showing
**Solution**: Check that hotelMappings are included in the Prisma query and properly parsed.

### Issue: Price Modifier Not Formatting
**Solution**: Ensure priceModifier is a number and handle null cases:
```typescript
const formatPriceModifier = (modifier: number | null) => {
  if (!modifier || modifier === 0) return 'Base Price';
  const sign = modifier > 0 ? '+' : '';
  return `${sign}${modifier}%`;
};
```

### Issue: Variant Cards Breaking Across Pages
**Solution**: Add page-break-inside: avoid to variant card styles:
```css
.variant-card {
  page-break-inside: avoid;
  break-inside: avoid-page;
}
```

## Future Enhancements

1. **Variant Comparison Table**: Side-by-side comparison of all variants
2. **Interactive PDF**: Clickable hotel links
3. **Pricing Breakdown**: Show variant-specific pricing
4. **Availability Calendar**: Show variant-specific dates
5. **Meal Plan Variations**: Display variant-specific meal plans
6. **Room Type Variations**: Show variant-specific room allocations

## Related Documentation

- `MULTI_VARIANT_SUMMARY.md` - Overview of variant feature
- `PACKAGE_VARIANTS_ARCHITECTURE_DIAGRAM.md` - System architecture
- `PACKAGE_VARIANTS_TESTING_GUIDE.md` - Testing procedures
- `PackageVariantsTab.tsx` - UI component for editing variants

## Support

For questions or issues with PDF generation with variants:
1. Check database query includes `packageVariants` with `hotelMappings`
2. Verify hotel data is available in the hotels array
3. Inspect console logs for parsing errors
4. Test with simplified variant data first

---

**Created**: 2025-10-03  
**Last Updated**: 2025-10-03  
**Status**: ✅ Implementation Complete
