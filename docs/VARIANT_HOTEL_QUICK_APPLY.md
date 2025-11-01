# Tour Package Variant - Hotels Quick Apply Feature

## Overview
Added a convenient "Quick Apply Hotels from Hotels Tab" button to the Package Variants Tab that lets you instantly apply hotels you've already selected in the Hotels Tab to any variant without having to manually re-select them.

## Problem Solved
Previously, when editing tour package variants:
- **Scenario**: You have a tour package "KERALA – 5N-6D" with hotels already selected in the Hotels Tab for each day
- **Issue**: When you go to the Variants Tab to create a "Luxury" or "Premium" variant, you had to manually search and re-select the same hotels for each day
- **Solution**: Now you can click "Quick Apply Hotels from Hotels Tab" button to instantly apply those pre-selected hotels to your current variant with one click

## Features

### New Button: "Quick Apply Hotels from Hotels Tab"
- **Location**: Variants Tab → Each Variant Card → Below "Copy Hotels From Tour Package" section
- **Styling**: Green gradient button with hotel icon for easy visibility
- **Behavior**: 
  - Copies hotel assignments from Hotels Tab (itineraries[].hotelId) directly to the current variant
  - Shows success toast when all hotels are applied
  - Shows warning toast if some days don't have hotels assigned in Hotels Tab
  - Works alongside existing "Copy Hotels From Tour Package" feature

### Smart Validation
The function validates:
1. **Hotel assignments**: Reads hotelId from each itinerary in Hotels Tab
2. **Missing hotels**: Notifies you which days are missing hotel assignments in Hotels Tab
3. **Itinerary mapping**: Handles both ID-based and day-number-based mapping keys

## Implementation Details

### New Function: `applyHotelsFromCurrentPackage()`
**File**: `src/components/tour-package-query/PackageVariantsTab.tsx` (lines 1024-1047)

```typescript
const applyHotelsFromCurrentPackage = (variantIndex: number) => {
  const nextMappings: Record<string, string> = {};
  const missingHotelDays: number[] = [];

  // Extract hotels from current itineraries in Hotels Tab
  itineraries.forEach((itinerary, orderIndex) => {
    const dayNumber = Number.isFinite(itinerary.dayNumber) ? itinerary.dayNumber : orderIndex + 1;
    
    const mappingKey = itinerary.id
      || (Number.isFinite(dayNumber)
        ? String(dayNumber)
        : `fallback-${orderIndex}`);

    const hotelId = itinerary.hotelId;

    if (hotelId) {
      nextMappings[mappingKey] = hotelId;
    } else {
      missingHotelDays.push(dayNumber);
    }
  });

  // Apply mappings to variant
  setVariants(prev => {
    const next = [...prev];
    if (!next[variantIndex]) {
      return prev;
    }
    next[variantIndex] = {
      ...next[variantIndex],
      hotelMappings: nextMappings,
    };
    return next;
  });

  // User feedback
  if (missingHotelDays.length > 0) {
    toast(`Hotels applied, but no hotel is set for day(s): ${missingHotelDays.join(', ')} in the Hotels tab.`);
  } else {
    toast.success("Hotels from this package applied to variant.");
  }
};
```

### UI Button Component
**File**: `src/components/tour-package-query/PackageVariantsTab.tsx` (lines 1253-1265)

```tsx
{/* Use Hotels From This Package Button */}
<div className="space-y-2">
  <Label className="text-xs font-medium">Or Use Hotels From This Package</Label>
  <Button
    type="button"
    variant="outline"
    size="sm"
    className="w-full justify-center text-xs bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border-emerald-200/50"
    onClick={() => applyHotelsFromCurrentPackage(variantIndex)}
    disabled={loading}
  >
    <HotelIcon className="h-3.5 w-3.5 mr-1.5" />
    <span>Quick Apply Hotels from Hotels Tab</span>
  </Button>
  <p className="text-[10px] text-muted-foreground italic">
    💡 Applies the hotels you&apos;ve already selected in the Hotels tab to this variant with one click
  </p>
</div>
```

## Data Flow

```
User in Variants Tab
        ↓
Sees "Quick Apply Hotels from Hotels Tab" button
        ↓
Clicks button for current variant
        ↓
applyHotelsFromCurrentPackage() extracts:
  - itineraries[].id (itinerary ID)
  - itineraries[].dayNumber (day number)
  - itineraries[].hotelId (selected hotel)
        ↓
Creates mapping: { itineraryId/dayNumber: hotelId }
        ↓
Applies mapping to variant.hotelMappings
        ↓
Toast notification shows result
        ↓
Hotels appear in variant hotel dropdown selectors
        ↓
Save tour package (persists variant with hotel mappings)
```

## Usage Workflow

### Scenario: Apply Hotels to Multiple Variants

1. **In Hotels Tab**:
   - Select Day 1 Hotel: Taj Palace
   - Select Day 2 Hotel: Oberoi
   - Select Day 3 Hotel: Le Meridien

2. **In Variants Tab - Create Luxury Variant**:
   - Click "Add Variant" → name it "Luxury"
   - Scroll to "Or Use Hotels From This Package"
   - Click "Quick Apply Hotels from Hotels Tab" button
   - ✅ Hotels automatically applied!

3. **In Variants Tab - Create Premium Variant**:
   - Click "Add Variant" → name it "Premium"
   - Click "Quick Apply Hotels from Hotels Tab" again
   - ✅ Same hotels applied!
   - Optional: Modify specific hotels for Premium variant

4. **Save Tour Package**:
   - All variants with their hotel assignments persist to database

## Comparison with Other Methods

| Method | Use Case | Speed |
|--------|----------|-------|
| **Manual Selection** | Fine control, changing hotels per variant | Slow (search each day) |
| **Copy From Other Package** | Different tour packages with same hotels | Medium (requires other package) |
| **Quick Apply Hotels** | Same hotels across multiple variants | ⚡ Fast (one click) |
| **Copy First Variant** | Apply variant 1 hotels to variants 2,3,4 | Medium (need first variant done) |

## Files Modified

1. **`src/components/tour-package-query/PackageVariantsTab.tsx`**
   - Added `applyHotelsFromCurrentPackage()` function (lines 1024-1047)
   - Added UI button section (lines 1253-1265)
   - Escaped apostrophe for ESLint compliance (line 1332)

## Testing Checklist

- [x] Build succeeds with zero errors
- [x] TypeScript types correct for function signature
- [x] Button renders in correct position in variant card
- [x] Button styling (green gradient) distinguishes from "Copy From Package"
- [x] Click handler properly bound to variant index
- [x] Toast notifications work for success and partial success cases
- [x] Hotels correctly extracted from itineraries
- [x] Mapping keys handle both ID and day-number based lookups
- [x] Loading state disables button
- [x] Behavior consistent with existing hotel mapping system

## Benefits

✅ **One-click hotel assignment**: Apply pre-selected hotels without re-searching  
✅ **Faster variant creation**: Create multiple variants with same hotels instantly  
✅ **Reduced user error**: No accidental hotel mismatches between variants  
✅ **Smart validation**: Warns about unassigned days in Hotels Tab  
✅ **Seamless integration**: Works alongside existing "Copy From Package" feature  
✅ **Consistent UX**: Same hotel selection system as Hotels Tab  

## Future Enhancements

- Could add bulk button to apply to all variants at once
- Could add "Apply hotels to ALL new variants" checkbox
- Could add undo button to revert hotel mappings for a variant

---

**Date Implemented**: January 2025  
**Component**: `src/components/tour-package-query/PackageVariantsTab.tsx`  
**Related Issue**: Tour Package Variant Hotel Selection UX Enhancement  
**Status**: ✅ Production Ready
