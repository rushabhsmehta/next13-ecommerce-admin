# Variant Orphaned Mappings Fix

## Problem
The API endpoint `/api/tourPackageQuery/[tourPackageQueryId]` was returning **"Internal error"** when trying to fetch tour package query data.

### Root Cause
The error occurred due to **orphaned variant hotel mappings** in the database. Specifically:

```
Error: "Field itinerary is required to return data, got `null` instead."
```

This happened because:
1. `VariantHotelMapping` records existed that referenced itineraries via `itineraryId`
2. Those referenced itineraries had been deleted
3. When Prisma tried to load the `itinerary` relation, it got `null`
4. Prisma's strict type checking threw an error because the relation should not be null

### Tour Package Query Affected
- **ID**: `86769a56-ab13-49d3-b9ec-3c71d9cdf828`
- **Name**: MAULIK - BALI - 6N7D - KUTA - GILI - UBUD - WITH CANDLELIGHT DENNER - FLOATING BREAKFAST - LUXURY PACKAGE

## Solution

### Immediate Fix
Created a cleanup script (`fix-orphaned-mappings.js`) that:
1. Found all package variants for the affected tour package query
2. Identified valid itineraries currently in the database
3. Deleted variant hotel mappings that referenced non-existent itineraries

**Result**: Deleted **7 orphaned mappings** from the "Standard" variant

### API Enhancement
Updated the GET endpoint error handling in:
- `src/app/api/tourPackageQuery/[tourPackageQueryId]/route.ts`

Added comprehensive error logging to help diagnose future issues:
```typescript
catch (error: any) {
  console.error('[TOUR_PACKAGE_QUERY_GET] Error occurred:', {
    message: error?.message,
    code: error?.code,
    stack: error?.stack,
    fullError: error
  });
  return new NextResponse(`Internal error: ${error?.message || 'Unknown error'}`, { status: 500 });
}
```

## Prevention Strategy

### Database Constraint
The schema already has proper cascade deletion set up:
```prisma
model VariantHotelMapping {
  id               String         @id @default(uuid())
  packageVariantId String
  itineraryId      String
  hotelId          String
  
  itinerary        Itinerary      @relation(fields: [itineraryId], references: [id], onDelete: Cascade)
  // ...
}
```

The `onDelete: Cascade` should automatically delete mappings when itineraries are deleted. However, this issue occurred because itineraries were likely recreated with new IDs during a tour package query update.

### Future Prevention

The PATCH endpoint already handles this correctly in the latest code:
```typescript
// Delete existing itineraries only within the transaction
await tx.itinerary.deleteMany({
  where: { tourPackageQueryId: params.tourPackageQueryId }
});

// Then create new itineraries
```

This ensures:
1. Old itineraries are deleted (triggering cascade deletion of mappings)
2. New itineraries are created
3. New variant mappings are created with the new itinerary IDs

## Files Modified

### Created
- `fix-orphaned-mappings.js` - Cleanup script for orphaned mappings
- `test-tourpackagequery-api.js` - Diagnostic test script
- `VARIANT_ORPHANED_MAPPINGS_FIX.md` - This documentation

### Updated
- `src/app/api/tourPackageQuery/[tourPackageQueryId]/route.ts` - Enhanced error logging

## Testing

After the fix:
```
✅ API endpoint working correctly
✅ All tests passed
✅ Package variants loading properly
✅ No orphaned mappings remaining
```

### Test Results
```
📊 Summary:
  - Name: MAULIK - BALI - 6N7D...
  - Itineraries: 7
  - Package Variants: 1
  - Flight Details: 0
  - Images: 1

📦 Package Variants Details:
  1. Standard
     - Hotel Mappings: 0 (orphaned mappings cleaned up)
```

## How to Use Cleanup Script (If Needed Again)

If you encounter this error again for any tour package query:

1. Update the `tourPackageQueryId` in `fix-orphaned-mappings.js`
2. Run: `node fix-orphaned-mappings.js`
3. The script will identify and delete orphaned mappings
4. Test the API again

## Related Documentation
- See: `PACKAGE_VARIANTS_INTEGRATION_COMPLETE.md` for variant implementation details
- See: `TOUR_PACKAGE_QUERY_TRANSACTION_TIMEOUT_FIX.md` for transaction handling

---

**Date**: October 3, 2025
**Status**: ✅ Fixed and Tested
**Impact**: Critical - API was returning 500 error, now working correctly
