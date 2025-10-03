# Tour Package Pricing Date Picker Fix

## Issue
Despite previous timezone fixes, the tour package pricing form was still showing date shifting. When selecting July 1st, 2025, it was displaying as May 31st, 2025.

## Root Cause
The tour package pricing form (`src/app/(dashboard)/tourPackages/[tourPackageId]/pricing/page.tsx`) was not using timezone-safe utilities:

1. Date display in form used `format(field.value, "PPP")` instead of `formatLocalDate()`
2. Date picker used `selected={field.value}` instead of `createDatePickerValue()`
3. Form submission sent raw dates instead of using `normalizeApiDate()`
4. Edit mode loaded dates with `utcToLocal()` but not `createDatePickerValue()`

## Fix Applied

### 1. Updated Imports
```typescript
import { formatLocalDate, createDatePickerValue, normalizeApiDate } from "@/lib/timezone-utils"
```

### 2. Fixed Start Date Field
```typescript
// Display
{field.value ? formatLocalDate(field.value, "PPP") : <span>Pick a date</span>}

// Picker Value
selected={createDatePickerValue(field.value)}
```

### 3. Fixed End Date Field
```typescript
// Display  
{field.value ? formatLocalDate(field.value, "PPP") : <span>Pick a date</span>}

// Picker Value
selected={createDatePickerValue(field.value)}
```

### 4. Fixed Form Submission
```typescript
const onSubmit = async (data: PricingFormValues) => {
  // Normalize dates for API submission
  const normalizedData = {
    ...data,
    startDate: normalizeApiDate(data.startDate),
    endDate: normalizeApiDate(data.endDate)
  };
  
  // Send normalized data to API
  await axios.post(`/api/tourPackages/${tourPackageId}/pricing`, normalizedData)
}
```

### 5. Fixed Edit Mode
```typescript
form.reset({
  startDate: createDatePickerValue(utcToLocal(pricingPeriod.startDate)),
  endDate: createDatePickerValue(utcToLocal(pricingPeriod.endDate)),
  // ... other fields
})
```

## API Verification
✅ API routes already properly use `dateToUtc()` for UTC storage:
- `/api/tourPackages/[tourPackageId]/pricing/route.ts` 
- `/api/tourPackages/[tourPackageId]/pricing/[pricingId]/route.ts`

## Result
Now when you select July 1st, 2025 in the date picker, it will:
1. Display correctly as "July 1st, 2025" in the UI
2. Submit the correct date to the API 
3. Store correctly in UTC in the database
4. Display correctly when editing existing pricing periods

## Files Modified
- `src/app/(dashboard)/tourPackages/[tourPackageId]/pricing/page.tsx`

## Testing
- ✅ TypeScript compilation passes
- ✅ Date picker shows correct dates
- ✅ Form submission uses normalized dates
- ✅ Edit mode loads dates correctly
