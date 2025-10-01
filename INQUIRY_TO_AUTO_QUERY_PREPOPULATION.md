# Inquiry to Auto Query Pre-population Feature

## Summary
Enhanced the automated query creation dialog to automatically pre-populate **Room Allocations** from the inquiry data, matching the existing behavior for Transport Details.

## Problem
When creating an automated query from an inquiry:
- ✅ Transport Details were being pre-filled from inquiry
- ❌ Room Allocations were NOT being pre-filled - users had to manually re-enter the same data

## Solution Implemented

### Changes Made
**File**: `src/components/dialogs/automated-query-creation-dialog.tsx`

Added a new `useEffect` hook to automatically populate room allocations from inquiry data when the dialog opens.

### Technical Details

#### New Room Allocations Pre-population Logic
```tsx
useEffect(() => {
  if (!inquiry) return;
  const existing = form.getValues('roomAllocations');
  // Check if existing room allocations have meaningful data
  const hasMeaningfulData = Array.isArray(existing) && 
    existing.some(ra => ra?.roomTypeId || ra?.occupancyTypeId || (ra?.quantity && ra.quantity > 1));
  
  if (!hasMeaningfulData && Array.isArray(inquiry.roomAllocations) && inquiry.roomAllocations.length > 0) {
    const mapped = inquiry.roomAllocations.map((allocation: any) => ({
      roomTypeId: allocation.roomTypeId || undefined,
      occupancyTypeId: allocation.occupancyTypeId || '',
      quantity: allocation.quantity || 1,
      customRoomType: allocation.customRoomType || '',
      useCustomRoomType: Boolean(allocation.customRoomType && allocation.customRoomType.trim().length > 0),
    }));
    form.setValue('roomAllocations', mapped);
    addLog({ step: 'roomAllocations/initFromInquiry', data: { count: mapped.length, allocations: mapped } });
  }
}, [inquiry, form, addLog]);
```

### Data Flow

1. **Inquiry Creation** (`inquiries/[inquiryId]/components/inquiry-form.tsx`)
   - User adds room allocations with:
     - Room Type
     - Occupancy Type
     - Meal Plan (optional)
     - Quantity
     - Guest Names (optional)
     - Notes (optional)
   - User adds transport details with:
     - Vehicle Type
     - Quantity
     - Airport Pickup/Drop flags
     - Pickup/Drop locations
     - Notes

2. **Inquiry Storage** (API: `/api/inquiries/[inquiryId]`)
   - Room allocations saved to `RoomAllocation` table with `inquiryId`
   - Transport details saved to `TransportDetail` table with `inquiryId`

3. **Auto Query Dialog Opens**
   - Fetches inquiry with `roomAllocations` and `transportDetails` relations
   - **NEW**: Pre-populates room allocations from inquiry
   - **EXISTING**: Pre-populates transport details from inquiry

4. **Query Creation** (Dialog submit)
   - Uses pre-populated room allocations (user can modify if needed)
   - Uses pre-populated transport details (user can modify if needed)
   - Creates tour package query with itineraries including both

### Smart Pre-population Logic

The useEffect only pre-populates if:
- ✅ Inquiry data is loaded
- ✅ Inquiry has room allocations
- ✅ Form doesn't already have meaningful room allocation data
  - Prevents overwriting if user manually entered data
  - Checks for: `roomTypeId`, `occupancyTypeId`, or `quantity > 1`

### Fields Mapped from Inquiry

**Room Allocations:**
- `roomTypeId` → Room Type selection
- `occupancyTypeId` → Occupancy Type selection
- `quantity` → Number of rooms
- `customRoomType` → Custom room type label (if used)
- `useCustomRoomType` → Flag for custom vs standard room type

**Transport Details** (already working):
- `vehicleTypeId` → Vehicle Type selection
- `quantity` → Number of vehicles
- `isAirportPickupRequired` → Airport pickup checkbox
- `isAirportDropRequired` → Airport drop checkbox
- `pickupLocation` → Pickup location text
- `dropLocation` → Drop location text
- `requirementDate` → Date field
- `notes` → Additional notes

### Debug Logging

Added comprehensive logging:
```json
{
  "step": "roomAllocations/initFromInquiry",
  "data": {
    "count": 3,
    "allocations": [
      {
        "roomTypeId": "abc-123",
        "occupancyTypeId": "def-456",
        "quantity": 2,
        "customRoomType": "",
        "useCustomRoomType": false
      }
    ]
  }
}
```

## User Experience Improvements

### Before
1. User creates inquiry with room allocations and transport details
2. User clicks "Create Auto Query" from inquiry
3. Dialog opens with:
   - ✅ Transport details pre-filled
   - ❌ Empty room allocation form (had to re-enter everything)

### After
1. User creates inquiry with room allocations and transport details
2. User clicks "Create Auto Query" from inquiry
3. Dialog opens with:
   - ✅ Transport details pre-filled
   - ✅ Room allocations pre-filled
4. User can modify if needed or proceed directly

## Benefits

✅ **Reduced Data Entry** - No need to re-enter room allocation details  
✅ **Consistency** - Same data flows from inquiry to query  
✅ **Time Savings** - Faster query creation process  
✅ **Error Reduction** - Less chance of typos or mismatched data  
✅ **Better UX** - Matches user expectations (transport details already worked this way)  
✅ **Flexibility** - Users can still modify pre-filled data if needed  

## Related Files

### Inquiry Form
- `src/app/(dashboard)/(routes)/inquiries/[inquiryId]/components/inquiry-form.tsx`
  - Room allocation UI and validation
  - Transport details UI and validation

### Auto Query Dialog
- `src/components/dialogs/automated-query-creation-dialog.tsx`
  - **Modified**: Added room allocation pre-population
  - **Existing**: Transport details pre-population
  - Form validation and submission

### API Routes
- `src/app/api/inquiries/[inquiryId]/route.ts`
  - Saves inquiry with roomAllocations and transportDetails
- `src/app/api/tourPackageQuery/route.ts`
  - Creates query with itineraries including room allocations and transport details

## Testing Instructions

### Test Case 1: Pre-population with Room Allocations
1. Create/Edit an inquiry
2. Add room allocations:
   - Example: 2x Deluxe Double rooms, 1x Suite Triple room
3. Add transport details:
   - Example: 1x Sedan for airport pickup
4. Save inquiry
5. Click "Create Auto Query" button
6. **Expected**: Dialog opens with:
   - Room allocations pre-filled with 2 Deluxe Double + 1 Suite Triple
   - Transport details pre-filled with 1 Sedan
7. Verify all fields match the inquiry data

### Test Case 2: Empty Inquiry Data
1. Create inquiry WITHOUT room allocations or transport details
2. Click "Create Auto Query"
3. **Expected**: Dialog opens with:
   - Single empty room allocation (default)
   - Empty transport details

### Test Case 3: Partial Data
1. Create inquiry with ONLY room allocations (no transport)
2. Click "Create Auto Query"
3. **Expected**: Room allocations pre-filled, transport empty
4. Create inquiry with ONLY transport (no room allocations)
5. Click "Create Auto Query"
6. **Expected**: Transport pre-filled, single empty room allocation

### Test Case 4: Custom Room Types
1. Create inquiry with custom room type:
   - Select "Custom" room type
   - Enter custom label: "Presidential Suite"
2. Click "Create Auto Query"
3. **Expected**: Custom room type pre-filled with label

### Test Case 5: Modification After Pre-fill
1. Create inquiry with 2 room allocations
2. Open auto query dialog (should pre-fill)
3. Modify room allocations (change quantity, add/remove rooms)
4. Submit query
5. **Expected**: Uses modified data, not original inquiry data

## Debug Logs to Check

When testing, check debug panel for:
```json
{"step": "roomAllocations/initFromInquiry", "data": {"count": 2, "allocations": [...]}}
{"step": "transport/initFromInquiry", "data": {"count": 1}}
```

## Database Schema

Both features use existing schema - no migrations needed:

```prisma
model RoomAllocation {
  id              String    @id @default(uuid())
  inquiryId       String?
  itineraryId     String?
  roomTypeId      String?
  occupancyTypeId String
  mealPlanId      String?
  quantity        Int       @default(1)
  guestNames      String?
  notes           String?
  customRoomType  String?
  // ... relations
}

model TransportDetail {
  id                      String    @id @default(uuid())
  inquiryId               String?
  itineraryId             String?
  vehicleTypeId           String
  quantity                Int       @default(1)
  isAirportPickupRequired Boolean   @default(false)
  isAirportDropRequired   Boolean   @default(false)
  pickupLocation          String?
  dropLocation            String?
  requirementDate         DateTime?
  notes                   String?
  // ... relations
}
```

## Edge Cases Handled

✅ Missing inquiry data - Falls back to empty form  
✅ Partial data - Only pre-fills available fields  
✅ Custom room types - Properly maps custom labels  
✅ Already populated form - Doesn't overwrite user changes  
✅ Invalid data types - Uses defaults (quantity: 1, booleans: false)  
✅ Null/undefined values - Converts to appropriate defaults  

---

**Status**: ✅ Implemented and Ready for Testing  
**Date**: October 1, 2025  
**Impact**: Medium - Improves workflow efficiency for all users creating queries from inquiries
