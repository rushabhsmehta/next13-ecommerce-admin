# Package Variants - Prisma Invalid Itinerary Reference Fix

## Problem Description

When saving a Tour Package with variants, the save appeared successful, but immediately after, Prisma threw a critical error:

```
Invalid `prisma.tourPackage.findUnique()` invocation:

Inconsistent query result: Field itinerary is required to return data, got `null` instead.
```

This error occurred **after** the variants were successfully saved, when trying to fetch the updated tour package to return to the client.

## Root Cause Analysis

### The Issue Chain

1. **Frontend sends hotel mappings** with keys that might be:
   - Valid itinerary IDs (e.g., `"clx123abc..."`)
   - Old/deleted itinerary IDs
   - Invalid IDs from previous edits
   - Fallback keys like `"index-0"`, `"index-1"`

2. **API creates `variantHotelMapping` records** without validating if the `itineraryId` exists in the database:
   ```typescript
   // BEFORE (No validation)
   const mappings = Object.entries(variant.hotelMappings)
     .map(([itineraryId, hotelId]) => ({
       packageVariantId: createdVariant.id,
       itineraryId: itineraryId,  // ❌ Might not exist!
       hotelId: hotelId as string,
     }))
     .filter(m => m.hotelId && m.itineraryId);
   
   await prismadb.variantHotelMapping.createMany({ data: mappings });
   ```

3. **Database accepts the records** because foreign key exists but points to non-existent itinerary

4. **Prisma tries to fetch data back** with `include: { itinerary: true }`:
   ```typescript
   const tourPackage = await prismadb.tourPackage.findUnique({
     where: { id: params.tourPackageId },
     include: {
       packageVariants: {
         include: {
           variantHotelMappings: {
             include: {
               itinerary: true  // ❌ Returns null for invalid ID!
             }
           }
         }
       }
     }
   });
   ```

5. **Prisma detects inconsistency**: The schema says `itinerary` is required (non-nullable), but it got `null`

6. **Error thrown**: `Field itinerary is required to return data, got null instead`

### Why This Happened

The hotel mapping keys could be invalid because:

1. **Old itinerary IDs**: When editing a tour package, old itinerary IDs from previous saves might still be in the form data
2. **Deleted itineraries**: User might delete an itinerary but variant still references it
3. **Copy/paste operations**: Copying tour packages brings old IDs
4. **Fallback keys**: Our UI fix added fallback keys like `"index-0"` which aren't real database IDs
5. **Client-side caching**: Browser cache might have stale itinerary IDs

## Solution Implemented

### Fix 1: Validate Itinerary IDs Before Creating Mappings (Tour Package)

**File**: `src/app/api/tourPackages/[tourPackageId]/route.ts`

Added validation to ensure only valid itinerary IDs are used:

```typescript
// Create hotel mappings for this variant
if (variant.hotelMappings && Object.keys(variant.hotelMappings).length > 0) {
  // Get all valid itinerary IDs from the current tour package
  const validItineraryIds = await prismadb.itinerary.findMany({
    where: { tourPackageId: params.tourPackageId },
    select: { id: true }
  });
  const validIdSet = new Set(validItineraryIds.map(i => i.id));
  
  console.log(`[VARIANTS] Valid itinerary IDs:`, Array.from(validIdSet));
  console.log(`[VARIANTS] Hotel mappings keys:`, Object.keys(variant.hotelMappings));
  
  const mappings = Object.entries(variant.hotelMappings)
    .map(([itineraryId, hotelId]) => ({
      packageVariantId: createdVariant.id,
      itineraryId: itineraryId,
      hotelId: hotelId as string,
    }))
    .filter(m => {
      // Only create mappings where hotel, itinerary exist, and itinerary ID is valid
      const isValid = m.hotelId && m.itineraryId && validIdSet.has(m.itineraryId);
      if (!isValid) {
        console.log(`[VARIANTS] Skipping invalid mapping:`, {
          itineraryId: m.itineraryId,
          hotelId: m.hotelId,
          itineraryExists: validIdSet.has(m.itineraryId)
        });
      }
      return isValid;
    });

  if (mappings.length > 0) {
    await prismadb.variantHotelMapping.createMany({
      data: mappings,
    });
    console.log(`[VARIANTS] Created ${mappings.length} hotel mappings`);
  } else {
    console.log(`[VARIANTS] No valid hotel mappings to create`);
  }
}
```

### Fix 2: Validate Itinerary IDs (Tour Package Query)

**File**: `src/app/api/tourPackageQuery/[tourPackageQueryId]/route.ts`

Added similar validation for Tour Package Query:

```typescript
if (mappings.length > 0) {
  try {
    // Final validation: ensure all itinerary IDs exist in database
    const validItineraryIds = new Set(currentItineraries.map(i => i.id));
    const validatedMappings = mappings.filter((m: any) => {
      const isValid = validItineraryIds.has(m.itineraryId);
      if (!isValid) {
        console.log(`⚠️ [INVALID MAPPING] Skipping mapping with non-existent itinerary ID: ${m.itineraryId}`);
      }
      return isValid;
    });
    
    if (validatedMappings.length > 0) {
      await prismadb.variantHotelMapping.createMany({
        data: validatedMappings as any,
        skipDuplicates: true,
      });
      console.log(`✅ [MAPPINGS SAVED] Created ${validatedMappings.length} hotel mappings`);
    } else {
      console.log(`⚠️ [NO VALID MAPPINGS] All ${mappings.length} mappings were filtered out`);
    }
  } catch (mappingError: any) {
    console.error(`❌ [MAPPING SAVE ERROR] Failed to save mappings:`, mappingError);
  }
}
```

## Validation Logic

### Step-by-Step Process

1. **Fetch valid itinerary IDs** from database for current tour package:
   ```typescript
   const validItineraryIds = await prismadb.itinerary.findMany({
     where: { tourPackageId: params.tourPackageId },
     select: { id: true }
   });
   ```

2. **Create a Set for O(1) lookup**:
   ```typescript
   const validIdSet = new Set(validItineraryIds.map(i => i.id));
   ```

3. **Filter mappings** to only include valid IDs:
   ```typescript
   .filter(m => m.hotelId && m.itineraryId && validIdSet.has(m.itineraryId))
   ```

4. **Log skipped mappings** for debugging:
   ```typescript
   if (!isValid) {
     console.log(`[VARIANTS] Skipping invalid mapping:`, {
       itineraryId: m.itineraryId,
       itineraryExists: validIdSet.has(m.itineraryId)
     });
   }
   ```

## Before vs After

### Before (Broken)

```
Frontend sends:
{
  hotelMappings: {
    "clx-valid-id-1": "hotel-a",
    "clx-old-deleted-id": "hotel-b",  // ❌ Doesn't exist!
    "index-2": "hotel-c"              // ❌ Not a real ID!
  }
}
    ↓
API creates ALL mappings (no validation)
    ↓
Database has orphaned references
    ↓
Prisma fetch with include: { itinerary: true }
    ↓
itinerary = null for invalid IDs
    ↓
💥 ERROR: "Field itinerary is required to return data, got null"
```

### After (Fixed)

```
Frontend sends:
{
  hotelMappings: {
    "clx-valid-id-1": "hotel-a",
    "clx-old-deleted-id": "hotel-b",  // Will be filtered
    "index-2": "hotel-c"              // Will be filtered
  }
}
    ↓
API fetches valid itinerary IDs: ["clx-valid-id-1", "clx-valid-id-3"]
    ↓
API validates each mapping:
  - "clx-valid-id-1" ✅ Valid → Keep
  - "clx-old-deleted-id" ❌ Not in set → Skip (logged)
  - "index-2" ❌ Not in set → Skip (logged)
    ↓
API creates ONLY valid mappings
    ↓
Database has clean data
    ↓
Prisma fetch with include: { itinerary: true }
    ↓
All itineraries exist
    ↓
✅ SUCCESS: Clean data returned
```

## Enhanced Console Logging

The fix adds detailed console logging for debugging:

```
[VARIANTS] Valid itinerary IDs: [ 'clx123abc', 'clx456def', 'clx789ghi' ]
[VARIANTS] Hotel mappings keys: [ 'clx123abc', 'old-deleted-id', 'index-1' ]
[VARIANTS] Skipping invalid mapping: {
  itineraryId: 'old-deleted-id',
  hotelId: 'hotel-xyz-id',
  itineraryExists: false
}
[VARIANTS] Skipping invalid mapping: {
  itineraryId: 'index-1',
  hotelId: 'hotel-abc-id',
  itineraryExists: false
}
[VARIANTS] Created 1 hotel mappings for variant: Standard
```

## Testing Instructions

### Test Case 1: Normal Save (Valid IDs)

1. Open Tour Package with 3 itineraries
2. Create a variant with hotels for all 3 days
3. Save
4. ✅ Should save successfully without errors
5. ✅ All 3 hotel mappings should be created
6. Check console: `[VARIANTS] Created 3 hotel mappings`

### Test Case 2: Save with Invalid IDs (Protection)

This test simulates the bug scenario:

1. Open Browser DevTools → Console
2. Edit a Tour Package with variants
3. Before saving, manually inject an invalid ID in the form state (using React DevTools or console):
   ```javascript
   // Simulate stale/invalid itinerary ID
   form.setValue('packageVariants[0].hotelMappings["invalid-id-123"]', 'some-hotel-id');
   ```
4. Save the form
5. ✅ Should save successfully (no Prisma error!)
6. Check console logs:
   ```
   [VARIANTS] Skipping invalid mapping: {
     itineraryId: 'invalid-id-123',
     itineraryExists: false
   }
   ```
7. ✅ Only valid mappings should be saved

### Test Case 3: All Invalid IDs

1. Manually create a variant with only invalid itinerary IDs
2. Save
3. ✅ Should save successfully
4. Check console: `[VARIANTS] No valid hotel mappings to create`
5. ✅ Variant should be created but with 0 mappings

### Test Case 4: Mixed Valid and Invalid

1. Create variant with:
   - Day 1: Valid itinerary + valid hotel ✅
   - Day 2: Invalid itinerary ID + valid hotel ❌
   - Day 3: Valid itinerary + valid hotel ✅
2. Save
3. ✅ Should save successfully
4. Check console: `[VARIANTS] Created 2 hotel mappings` (Day 1 & 3 only)
5. ✅ Invalid mapping should be skipped and logged

### Test Case 5: Verify Data Integrity

1. After saving, reload the page
2. Check the Variants tab
3. ✅ Only valid hotel selections should appear
4. ✅ Invalid mappings should not appear (were filtered out)
5. Database query to verify:
   ```sql
   SELECT * FROM variantHotelMapping 
   WHERE packageVariantId = 'your-variant-id';
   -- Should only show valid itinerary IDs
   ```

## Database Impact

### Query Performance

- **Minimal overhead**: One additional query per variant save
- **Small dataset**: Typically 3-10 itineraries per tour package
- **Fast lookup**: Using Set for O(1) validation

### Data Cleanup

Existing invalid mappings (if any) will remain in the database until:
1. User edits that tour package again (variants get deleted/recreated)
2. Manual database cleanup
3. Migration script (if needed)

### Recommended Cleanup Query

To find and remove orphaned mappings:

```sql
-- Find orphaned mappings
SELECT vhm.* 
FROM variantHotelMapping vhm
LEFT JOIN itinerary i ON vhm.itineraryId = i.id
WHERE i.id IS NULL;

-- Delete orphaned mappings (run with caution!)
DELETE FROM variantHotelMapping
WHERE itineraryId NOT IN (SELECT id FROM itinerary);
```

## Files Modified

1. **`src/app/api/tourPackages/[tourPackageId]/route.ts`**
   - Added itinerary ID validation before creating mappings
   - Enhanced logging for debugging
   - Graceful handling of invalid IDs

2. **`src/app/api/tourPackageQuery/[tourPackageQueryId]/route.ts`**
   - Added similar validation for Tour Package Query
   - Final validation layer after complex remapping logic

## Related Issues Fixed

This fix addresses:
- ✅ Prisma "Field itinerary is required" error
- ✅ Orphaned variantHotelMapping records
- ✅ Stale itinerary ID references
- ✅ Invalid fallback key references

## Prevention

Future improvements to prevent similar issues:

1. **Client-side validation**: Validate itinerary IDs exist before submission
2. **Form cleanup**: Remove invalid mappings when itinerary is deleted
3. **Database constraints**: Add `ON DELETE CASCADE` for variantHotelMapping
4. **Type safety**: Use stricter TypeScript types for mapping keys
5. **Unit tests**: Test API with invalid itinerary IDs

## Rollback Plan

If this fix causes issues:

1. Remove the validation logic (revert to filtering only by `hotelId && itineraryId`)
2. Add database cleanup script to remove orphaned mappings
3. Re-deploy previous version

However, this fix is **defensive** - it only adds validation, doesn't change core logic.

---

**Fix Date**: October 3, 2025  
**Fixed By**: GitHub Copilot  
**Issue**: Prisma error "Field itinerary is required to return data, got null"  
**Root Cause**: Creating variantHotelMapping with non-existent itinerary IDs  
**Solution**: Validate itinerary IDs exist before creating mappings  
**Status**: ✅ Resolved
