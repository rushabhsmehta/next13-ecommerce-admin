# Multi-Variant Tour Package Implementation Guide

## ✅ COMPLETED - Database Schema

### New Tables Created:

1. **PackageVariant**
   - Stores variant definitions (Luxury, Premium, Standard, etc.)
   - Links to TourPackage or TourPackageQuery
   - Fields: name, description, isDefault, sortOrder, priceModifier

2. **VariantHotelMapping**
   - Maps variants to specific hotels for each itinerary day
   - Unique constraint: one hotel per variant per day
   - Cascade deletion when variant is deleted

### Schema Changes Applied:
- ✅ Added `packageVariants` relation to `TourPackage`
- ✅ Added `packageVariants` relation to `TourPackageQuery`
- ✅ Added `variantHotelMappings` relation to `Itinerary`
- ✅ Added `variantHotelMappings` relation to `Hotel`
- ✅ Database migration completed with `prisma db push`

## ✅ COMPLETED - API Layer

### Endpoints Created:

1. **GET /api/package-variants**
   - Query params: `tourPackageId` or `tourPackageQueryId`
   - Returns all variants with hotel mappings

2. **POST /api/package-variants**
   - Create new variant
   - Body: name, description, tourPackageId/tourPackageQueryId, isDefault, sortOrder, priceModifier

3. **GET /api/package-variants/[variantId]**
   - Get specific variant with all hotel mappings

4. **PATCH /api/package-variants/[variantId]**
   - Update variant details

5. **DELETE /api/package-variants/[variantId]**
   - Delete variant (cascades to mappings)

6. **POST /api/package-variants/[variantId]/hotel-mappings**
   - Bulk update hotel mappings
   - Body: `{ mappings: [{ itineraryId, hotelId }] }`

7. **GET /api/package-variants/[variantId]/hotel-mappings**
   - Get hotel mappings for a variant

## ✅ COMPLETED - UI Component

### PackageVariantsTab Component Created:
Location: `src/components/tour-package-query/PackageVariantsTab.tsx`

Features:
- ✅ Add/Remove variants
- ✅ Configure variant settings (name, description, price modifier, default)
- ✅ Tab-based navigation between variants
- ✅ Hotel assignment per day for each variant
- ✅ Visual hotel selection with images
- ✅ Copy hotels from first variant to all
- ✅ Summary view showing completion status
- ✅ Responsive design with Tailwind CSS
- ✅ Integration with React Hook Form

## 🔄 TODO - Integration Steps

### Step 1: Add PackageVariantsTab to Tour Package Query Form

You need to integrate the new tab into your tour package query form:

**File to Edit:** `src/app/(dashboard)/tourPackageQuery/[tourPackageQueryId]/components/tourPackageQuery-form.tsx`

```tsx
// 1. Import the component
import PackageVariantsTab from '@/components/tour-package-query/PackageVariantsTab';

// 2. Add to the tabs navigation (around line 800-900)
<TabsList className="grid w-full grid-cols-7"> // Change cols-6 to cols-7
  {/* ... existing tabs ... */}
  <TabsTrigger value="variants" className="text-xs">
    <Sparkles className="h-4 w-4 mr-1" /> Variants
  </TabsTrigger>
</TabsList>

// 3. Add the tab content (after other TabsContent)
<TabsContent value="variants" className="space-y-6">
  <PackageVariantsTab
    control={control}
    form={form}
    loading={loading}
    hotels={hotels}
  />
</TabsContent>
```

### Step 2: Update Form Schema

Add packageVariants to your form schema:

```tsx
// In formSchema
packageVariants: z.array(z.object({
  name: z.string(),
  description: z.string().optional(),
  isDefault: z.boolean(),
  sortOrder: z.number(),
  priceModifier: z.number().optional(),
  hotelMappings: z.record(z.string()),
})).optional(),
```

### Step 3: Update API Save Logic

**File:** `src/app/api/tourPackageQuery/[tourPackageQueryId]/route.ts`

In the PATCH handler, add logic to save variants:

```typescript
// After saving tour package query
if (packageVariants && packageVariants.length > 0) {
  // Delete existing variants
  await prismadb.packageVariant.deleteMany({
    where: { tourPackageQueryId: params.tourPackageQueryId }
  });

  // Create new variants with mappings
  for (const variant of packageVariants) {
    const createdVariant = await prismadb.packageVariant.create({
      data: {
        name: variant.name,
        description: variant.description,
        isDefault: variant.isDefault,
        sortOrder: variant.sortOrder,
        priceModifier: variant.priceModifier,
        tourPackageQueryId: params.tourPackageQueryId,
      }
    });

    // Create hotel mappings
    const mappings = Object.entries(variant.hotelMappings).map(([itineraryId, hotelId]) => ({
      packageVariantId: createdVariant.id,
      itineraryId,
      hotelId: hotelId as string,
    }));

    if (mappings.length > 0) {
      await prismadb.variantHotelMapping.createMany({
        data: mappings,
      });
    }
  }
}
```

### Step 4: Load Existing Variants

Update the GET handler to include variants:

```typescript
const tourPackageQuery = await prismadb.tourPackageQuery.findUnique({
  where: { id: params.tourPackageQueryId },
  include: {
    // ... existing includes
    packageVariants: {
      include: {
        variantHotelMappings: {
          include: {
            hotel: { include: { images: true } },
            itinerary: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    },
  },
});
```

### Step 5: Transform Data for Form

In the form component, transform loaded variants:

```typescript
const transformedVariants = initialData?.packageVariants?.map(v => ({
  id: v.id,
  name: v.name,
  description: v.description,
  isDefault: v.isDefault,
  sortOrder: v.sortOrder,
  priceModifier: v.priceModifier,
  hotelMappings: v.variantHotelMappings.reduce((acc, mapping) => {
    acc[mapping.itineraryId] = mapping.hotelId;
    return acc;
  }, {} as Record<string, string>),
})) || [];

// Set in form default values
packageVariants: transformedVariants,
```

## 🎨 UI/UX Enhancements (Optional)

### Enhanced Hotels Tab - Multi-Variant View

You can enhance the existing HotelsTab to show variant-based hotel assignments:

```tsx
// Add variant selector at top of HotelsTab
{variants.length > 0 && (
  <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
    <SelectTrigger>
      <SelectValue placeholder="Select Variant" />
    </SelectTrigger>
    <SelectContent>
      {variants.map(v => (
        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
)}
```

### Display Component Updates

**File:** `src/app/(dashboard)/tourPackageQueryDisplay/[tourPackageQueryId]/components/tourPackageQueryDisplay.tsx`

Add variant selector:

```tsx
const [selectedVariant, setSelectedVariant] = useState(defaultVariant);

// Show hotels based on selected variant
const getHotelForDay = (itinerary) => {
  if (selectedVariant) {
    const mapping = selectedVariant.variantHotelMappings.find(
      m => m.itineraryId === itinerary.id
    );
    return mapping?.hotel || hotels.find(h => h.id === itinerary.hotelId);
  }
  return hotels.find(h => h.id === itinerary.hotelId);
};
```

## 📊 Example Usage Flow

### Creating a Kashmir Tour with Variants

```typescript
// 1. Create base itinerary (existing flow)
const itineraries = [
  { day: 1, location: "Srinagar", activities: [...] },
  { day: 2, location: "Gulmarg", activities: [...] },
  { day: 3, location: "Pahalgam", activities: [...] },
];

// 2. Create variants with hotel mappings
const variants = [
  {
    name: "Luxury",
    description: "Premium 5-star accommodations",
    priceModifier: 50,
    isDefault: false,
    hotelMappings: {
      [itinerary1.id]: lalitPalaceId,
      [itinerary2.id]: khyberResortId,
      [itinerary3.id]: welcomHotelId,
    }
  },
  {
    name: "Premium",
    description: "Comfortable 4-star hotels",
    priceModifier: 25,
    isDefault: true,
    hotelMappings: {
      [itinerary1.id]: vivantaDalViewId,
      [itinerary2.id]: highlandsId,
      [itinerary3.id]: heevanId,
    }
  },
  {
    name: "Standard",
    description: "Budget-friendly 3-star options",
    priceModifier: 0,
    isDefault: false,
    hotelMappings: {
      [itinerary1.id]: cityStarId,
      [itinerary2.id]: pinepalaceId,
      [itinerary3.id]: paradiseId,
    }
  }
];
```

## 🔍 Testing Checklist

- [ ] Create a new tour package query
- [ ] Add itineraries
- [ ] Navigate to Variants tab
- [ ] Create 3 variants (Luxury, Premium, Standard)
- [ ] Assign different hotels to each variant for each day
- [ ] Save the form
- [ ] Reload and verify variants are loaded correctly
- [ ] Test variant deletion
- [ ] Test copy hotels functionality
- [ ] Test default variant selection
- [ ] Verify hotel mappings display correctly
- [ ] Test API endpoints directly

## 🚀 Deployment Notes

1. **Database Migration**: Already completed with `prisma db push`
2. **No Breaking Changes**: Backward compatible - existing packages without variants continue to work
3. **Gradual Rollout**: Variants are optional feature
4. **Performance**: Indexed properly for fast queries

## 📝 Additional Features (Future Enhancements)

1. **Variant-based Pricing Display**
   - Show price comparison table
   - Calculate per-person costs by variant

2. **Variant Filtering in Search**
   - Allow customers to filter by variant type
   - Show all available variants for a destination

3. **Bulk Operations**
   - Clone variants across multiple packages
   - Template system for common variant configurations

4. **Analytics**
   - Track bookings by variant
   - Compare popularity of different variants
   - Revenue analysis per variant

5. **Room Allocations per Variant**
   - Different room configurations for different variants
   - Variant-specific transport options

## 🎯 Next Immediate Steps

1. ✅ Complete database schema ← DONE
2. ✅ Create API endpoints ← DONE
3. ✅ Build PackageVariantsTab component ← DONE
4. ⏳ Integrate tab into tour package query form
5. ⏳ Update save/load logic
6. ⏳ Test end-to-end flow
7. ⏳ Update display components
8. ⏳ Generate PDFs with variant selection

---

**Status**: Phase 1 Complete (Database + API + Component)
**Next**: Integration with existing forms
**Date**: October 2, 2025
