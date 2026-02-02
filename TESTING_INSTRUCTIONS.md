# Testing Instructions for Date Shifting Fix

## Overview
This fix addresses date shifting issues in hotel pricing and transport pricing. Test the following scenarios to verify the fix works correctly.

## 1. Hotel Pricing Period Creation

### Test Case 1.1: Simple Period Creation
1. Navigate to a hotel's pricing page
2. Click "Add Pricing Period"
3. Enter:
   - Start Date: June 15, 2024
   - End Date: June 30, 2024
   - Room Type: Any
   - Occupancy: Any
   - Price: 5000
4. Click "Create"
5. **Verify**: The period displays as June 15 - June 30 (no shift to June 14 or June 16)

### Test Case 1.2: Period Splitting
1. Create a base period: June 1 - June 30, 2024 (Price: 5000)
2. Create an overlapping period with "Apply Split" enabled:
   - Start Date: June 10, 2024
   - End Date: June 20, 2024
   - Same room type and occupancy
   - Price: 7000
3. **Verify the resulting periods**:
   - Period 1: June 1 - June 9 (Price: 5000) ✓
   - Period 2: June 10 - June 20 (Price: 7000) ✓
   - Period 3: June 21 - June 30 (Price: 5000) ✓
4. **Check for errors**: 
   - Period 1 should NOT end on June 10
   - Period 3 should NOT start on June 20
   - There should be NO gaps or overlaps

## 2. Transport Pricing Edit

### Test Case 2.1: Edit Existing Period
1. Navigate to Configuration → Transport Pricing
2. Find an existing pricing entry
3. Click Edit
4. **Verify**: Start and end dates display correctly (match what was originally saved)
5. Change the price (don't change dates)
6. Save
7. **Verify**: Dates remain unchanged

### Test Case 2.2: Edit Dates
1. Edit a transport pricing entry
2. Note the current start date (e.g., March 1, 2024)
3. Change the start date to March 5, 2024
4. Save
5. Refresh the page
6. Edit again
7. **Verify**: Start date shows as March 5, 2024 (not March 4 or March 6)

## 3. Edge Cases

### Test Case 3.1: Month Boundaries
1. Create a hotel pricing period:
   - Start: March 31, 2024
   - End: April 1, 2024
2. **Verify**: Dates display as March 31 - April 1 (not March 30 - March 31)

### Test Case 3.2: Year Boundaries
1. Create a period:
   - Start: December 31, 2024
   - End: January 1, 2025
2. **Verify**: No date shift across year boundary

### Test Case 3.3: DST Transitions (if applicable)
1. Create periods around DST transition dates for your timezone
2. **Verify**: No unexpected date shifts

## 4. Bulk Import (Hotel Pricing)

### Test Case 4.1: CSV Import
1. Use the hotel pricing import feature
2. Import a CSV with specific dates (e.g., June 15-20, 2024)
3. **Verify**: Imported dates match the CSV exactly

## Expected Behavior After Fix

✅ **Correct Behavior**:
- Dates entered are the dates displayed
- Period splitting creates adjacent periods with no gaps
- Edit forms show the exact dates that were saved
- No ±1 day shifts in any scenario

❌ **Previous Bug Behavior** (should NOT occur anymore):
- Entering June 15 displayed as June 14 or June 16
- Split periods had gaps or overlaps
- Edit forms showed different dates than what was saved

## Verification Queries (Optional - For Database Inspection)

If you have database access, you can verify dates are stored correctly:

```sql
-- Check hotel pricing dates
SELECT 
  id,
  hotelId,
  DATE(startDate) as start,
  DATE(endDate) as end,
  price
FROM HotelPricing
WHERE hotelId = 'your-hotel-id'
ORDER BY startDate;

-- Check transport pricing dates
SELECT
  id,
  locationId,
  DATE(startDate) as start,
  DATE(endDate) as end,
  price
FROM TransportPricing
WHERE locationId = 'your-location-id'
ORDER BY startDate;
```

All dates in the database should be stored at 12:00 noon UTC to avoid DST issues.

## Reporting Issues

If you still see date shifting after this fix:
1. Note the exact scenario (which form, which dates)
2. Check your browser's timezone
3. Note the server's timezone
4. Take screenshots of the issue
5. Report with all details
