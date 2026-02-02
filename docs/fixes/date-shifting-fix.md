# Date Shifting Fix - Hotel & Transport Pricing

## Problem Statement

Users reported that when entering dates in the hotel pricing dashboard (specifically start and end dates for pricing periods), the dates would shift to the next or previous day. This issue also affected transport pricing forms.

## Root Causes

### 1. Period Splitting with Local Date Mutation

**Location**: `src/app/api/hotels/[hotelId]/pricing/route.ts` and `check-overlap/route.ts`

**Issue**: When splitting overlapping pricing periods, the code was using JavaScript's `setDate()` method which operates on local timezone:

```typescript
// ❌ OLD CODE (WRONG)
const beforeEnd = new Date(newStart);
beforeEnd.setDate(beforeEnd.getDate() - 1);  // Mutates in local timezone!
```

**Problem**: The `setDate()` method interprets the date in the local timezone of the server, then the mutated Date object is stored directly to the database. This causes:
- If server is in IST (UTC+5:30): A date could shift by a day
- If server timezone changes: Inconsistent behavior
- DST transitions: Potential for unexpected shifts

### 2. Missing UTC-to-Local Conversion in Forms

**Location**: Transport pricing forms

**Issue**: When loading dates from the database into edit forms, the code was creating Date objects directly:

```typescript
// ❌ OLD CODE (WRONG)
startDate: new Date(initialData.startDate)
```

**Problem**: Dates stored in DB are in UTC. Creating a Date object directly interprets the ISO string in the current timezone, potentially causing a 1-day shift when displayed.

## Solutions Implemented

### 1. Use Timestamp Arithmetic Instead of Date Mutation

**Files Changed**:
- `src/app/api/hotels/[hotelId]/pricing/route.ts`
- `src/app/api/hotels/[hotelId]/pricing/check-overlap/route.ts`
- `src/lib/timezone-utils.ts` (added constant)

**Fix**: Replace `setDate()` with timestamp arithmetic that works purely in milliseconds:

```typescript
// ✅ NEW CODE (CORRECT)
import { MILLISECONDS_PER_DAY } from '@/lib/timezone-utils';

const beforeEndTimestamp = newStart.getTime() - MILLISECONDS_PER_DAY;
const beforeEnd = new Date(beforeEndTimestamp);
```

**Why This Works**:
- `getTime()` returns milliseconds since Unix epoch (always UTC)
- Adding/subtracting milliseconds stays in UTC
- No timezone interpretation issues
- Works consistently regardless of server timezone

### 2. Use `utcToLocal()` When Loading Dates into Forms

**Files Changed**:
- `src/app/(dashboard)/(routes)/transport-pricing/[transportPricingId]/components/transport-pricing-form.tsx`
- `src/app/(dashboard)/(routes)/transport-pricing/components/transport-pricing-modal.tsx`

**Fix**: Use the `utcToLocal()` helper when populating form fields:

```typescript
// ✅ NEW CODE (CORRECT)
import { utcToLocal } from '@/lib/timezone-utils';

const defaultValues = {
  startDate: utcToLocal(initialData.startDate) || new Date(),
  endDate: utcToLocal(initialData.endDate) || new Date(),
  // ...
};
```

**Why This Works**:
- `utcToLocal()` extracts UTC date components (year, month, day)
- Creates a new local Date with those same components
- Form displays the intended date without timezone shift
- When submitting, `dateToUtc()` converts back to UTC for storage

## Existing Correct Implementations

The following were already implemented correctly and did NOT need fixes:

✅ **Hotel Pricing POST/PATCH APIs**: Already using `dateToUtc()` for initial date storage
✅ **Tour Package Pricing APIs**: Already using `dateToUtc()` 
✅ **Transport Pricing API**: Already using `dateToUtc()`
✅ **Hotel Pricing Display**: Already using `utcToLocal()` + `formatLocalDate()`

## Testing

To verify the fix:

1. **Hotel Pricing Period Splitting**:
   - Create a pricing period (e.g., June 1-30, 2024)
   - Create an overlapping period (e.g., June 10-20, 2024) with "Apply Split" enabled
   - Verify the split creates correct segments:
     - Before: June 1-9 (not June 1-10)
     - New: June 10-20
     - After: June 21-30 (not June 20-30)

2. **Transport Pricing Edit**:
   - Create a transport pricing with specific dates
   - Edit it and verify dates display correctly (no ±1 day shift)
   - Save and verify dates are stored correctly

3. **Date Display Verification**:
   - Check that all pricing period dates display the same date that was entered
   - Verify dates don't shift when viewing after saving

## Related Utilities

### Core Timezone Functions (`src/lib/timezone-utils.ts`)

- `dateToUtc(date)`: Convert local date to UTC for database storage
- `utcToLocal(utcDate)`: Convert UTC date from DB to local for display
- `normalizeApiDate(date)`: Normalize dates for API requests
- `createDatePickerValue(dateValue)`: Prepare dates for date pickers
- `formatLocalDate(date, format)`: Format dates for display
- `MILLISECONDS_PER_DAY`: Constant for date arithmetic (24 * 60 * 60 * 1000)

### Usage Pattern

```typescript
// When saving to database:
const utcDate = dateToUtc(formDate);
await prisma.create({ data: { startDate: utcDate } });

// When loading from database:
const localDate = utcToLocal(dbRecord.startDate);
form.setValue('startDate', localDate);

// When doing date arithmetic:
const nextDay = new Date(date.getTime() + MILLISECONDS_PER_DAY);
const prevDay = new Date(date.getTime() - MILLISECONDS_PER_DAY);
```

## Migration Notes

No database migration required - this fix only changes how dates are manipulated in memory, not how they're stored.

## See Also

- `docs/fixes/timezone-utc-fixes.md` - Original timezone fix documentation
- `src/lib/timezone-utils.ts` - Timezone utility functions
- Custom Instructions section on "Timezone Handling (CRITICAL)"
