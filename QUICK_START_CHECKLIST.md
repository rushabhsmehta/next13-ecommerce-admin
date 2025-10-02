# ✅ Multi-Variant Tour Package - Quick Start Checklist

## Phase 1: Database & API ✅ COMPLETE

- [x] Database schema updated with `PackageVariant` and `VariantHotelMapping` tables
- [x] Prisma schema pushed to database
- [x] API endpoints created and tested
- [x] PackageVariantsTab component built

## Phase 2: Integration 🔄 YOUR NEXT STEPS

### Step 1: Import Component ⏱️ 2 minutes

**File:** `src/app/(dashboard)/tourPackageQuery/[tourPackageQueryId]/components/tourPackageQuery-form.tsx`

```tsx
// Add this import at the top with other imports
import PackageVariantsTab from '@/components/tour-package-query/PackageVariantsTab';
```

**Status:** ⬜ Not Started

---

### Step 2: Add Tab to Navigation ⏱️ 3 minutes

**File:** Same file as Step 1

**Find this line (around line 800-900):**
```tsx
<TabsList className="grid w-full grid-cols-6">
```

**Change to:**
```tsx
<TabsList className="grid w-full grid-cols-7">
```

**Add this tab (with other TabsTrigger elements):**
```tsx
<TabsTrigger value="variants" className="text-xs">
  <Sparkles className="h-4 w-4 mr-1" /> Variants
</TabsTrigger>
```

**Status:** ⬜ Not Started

---

### Step 3: Add Tab Content ⏱️ 2 minutes

**File:** Same file

**Add after the last TabsContent (around line 1500+):**
```tsx
<TabsContent value="variants" className="space-y-6">
  <PackageVariantsTab
    control={control}
    form={form}
    loading={loading}
    hotels={hotels}
  />
</TabsContent>
```

**Status:** ⬜ Not Started

---

### Step 4: Update Form Schema ⏱️ 3 minutes

**File:** Same file

**Find the formSchema definition and add:**
```tsx
packageVariants: z.array(z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  isDefault: z.boolean(),
  sortOrder: z.number(),
  priceModifier: z.number().optional(),
  hotelMappings: z.record(z.string()),
})).optional(),
```

**In defaultValues, add:**
```tsx
packageVariants: [],
```

**Status:** ⬜ Not Started

---

### Step 5: Load Variants from Database ⏱️ 5 minutes

**File:** `src/app/api/tourPackageQuery/[tourPackageQueryId]/route.ts`

**In the GET handler, update the include:**
```tsx
const tourPackageQuery = await prismadb.tourPackageQuery.findUnique({
  where: { id: params.tourPackageQueryId },
  include: {
    // ... existing includes (keep all of them)
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

**Status:** ⬜ Not Started

---

### Step 6: Transform Loaded Data ⏱️ 5 minutes

**File:** `src/app/(dashboard)/tourPackageQuery/[tourPackageQueryId]/components/tourPackageQuery-form.tsx`

**Add this transformation function (before the form initialization):**
```tsx
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
```

**Update defaultValues:**
```tsx
packageVariants: transformedVariants,
```

**Status:** ⬜ Not Started

---

### Step 7: Save Variants to Database ⏱️ 10 minutes

**File:** `src/app/api/tourPackageQuery/[tourPackageQueryId]/route.ts`

**In the PATCH handler, add this code AFTER saving the tour package query but BEFORE the final return:**

```tsx
// Save Package Variants
const { packageVariants } = body;

if (packageVariants && packageVariants.length > 0) {
  // Delete existing variants for this tour package query
  await prismadb.packageVariant.deleteMany({
    where: { tourPackageQueryId: params.tourPackageQueryId }
  });

  // Create new variants with hotel mappings
  for (const variant of packageVariants) {
    const createdVariant = await prismadb.packageVariant.create({
      data: {
        name: variant.name,
        description: variant.description || null,
        isDefault: variant.isDefault || false,
        sortOrder: variant.sortOrder || 0,
        priceModifier: variant.priceModifier || 0,
        tourPackageQueryId: params.tourPackageQueryId,
      }
    });

    // Create hotel mappings for this variant
    if (variant.hotelMappings && Object.keys(variant.hotelMappings).length > 0) {
      const mappings = Object.entries(variant.hotelMappings)
        .map(([itineraryId, hotelId]) => ({
          packageVariantId: createdVariant.id,
          itineraryId: itineraryId,
          hotelId: hotelId as string,
        }))
        .filter(m => m.hotelId); // Only create mappings where hotel is selected

      if (mappings.length > 0) {
        await prismadb.variantHotelMapping.createMany({
          data: mappings,
        });
      }
    }
  }
}
```

**Status:** ⬜ Not Started

---

### Step 8: Test! ⏱️ 10 minutes

1. Start your dev server: `npm run dev`
2. Open an existing tour package query (or create a new one)
3. Add some itinerary days
4. Go to the new "Variants" tab
5. Click "Add Variant" to create your first variant
6. Name it "Luxury" and set price modifier to 50
7. Assign hotels for each day
8. Create another variant "Standard" with 0% modifier
9. Assign different hotels
10. Click Save
11. Reload the page
12. Verify variants are loaded correctly
13. Check database to confirm records were created

**Status:** ⬜ Not Started

---

## Verification Checklist

After completing all steps, verify:

- [ ] New "Variants" tab appears in tour package query form
- [ ] Can create multiple variants with different names
- [ ] Can assign different hotels to each variant for each day
- [ ] Hotels show with images in the dropdowns
- [ ] Can set price modifier per variant
- [ ] Can mark one variant as default
- [ ] "Copy First Variant Hotels" button works
- [ ] Data saves correctly to database
- [ ] Data loads correctly when reopening the form
- [ ] Can delete variants (except the last one)
- [ ] Summary shows hotel assignment status

---

## Estimated Total Time

- **Database & API Setup:** ✅ Already Done
- **Integration:** ~30 minutes
- **Testing:** ~10 minutes
- **Total:** ~40 minutes

---

## Need Help?

### Quick Reference Files:

1. **Complete Design:** `MULTI_VARIANT_TOUR_PACKAGE_DESIGN.md`
2. **Implementation Guide:** `MULTI_VARIANT_IMPLEMENTATION_STATUS.md`
3. **Example Usage:** `MULTI_VARIANT_EXAMPLE_WALKTHROUGH.md`
4. **Architecture:** `MULTI_VARIANT_ARCHITECTURE_DIAGRAM.md`
5. **Summary:** `MULTI_VARIANT_SUMMARY.md`
6. **Component:** `src/components/tour-package-query/PackageVariantsTab.tsx`
7. **API:** `src/app/api/package-variants/`

### Common Issues & Solutions:

**Issue:** Tab doesn't show up
- **Solution:** Check grid-cols value is updated to 7

**Issue:** Form validation errors
- **Solution:** Ensure packageVariants is in formSchema

**Issue:** Data not saving
- **Solution:** Check PATCH handler has variant save logic

**Issue:** Data not loading
- **Solution:** Check GET handler includes packageVariants

---

## After Integration

### Phase 3: Display Updates (Optional)

You can enhance the customer-facing display to show variants:

1. Add variant selector to tour package display
2. Show different hotels based on selected variant
3. Add comparison table for all variants
4. Generate separate PDFs per variant

### Phase 4: Advanced Features (Future)

- Bulk variant creation across multiple packages
- Variant templates
- Variant-specific room allocations
- Analytics dashboard for variant performance

---

## Support

All code is complete and documented. Follow the steps above sequentially for smooth integration. The system is backward compatible, so existing packages will continue to work normally!

**Ready to start? Begin with Step 1! 🚀**
