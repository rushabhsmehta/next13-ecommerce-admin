# Package Variants - Testing Guide

## Quick Start Testing

### Test Scenario 1: Create Kashmir Tour with 3 Variants

#### Step 1: Create Base Package
1. Navigate to **Tour Package Query** section
2. Click **New Tour Package Query**
3. Fill in basic details:
   - **Name:** Kashmir Paradise Tour
   - **Location:** Kashmir
   - **Duration:** 5 Days / 4 Nights
   - **Adults:** 2
   - **Date Range:** Any future dates

#### Step 2: Add Itinerary
Add 5 days of itinerary:

**Day 1:** Srinagar Arrival
- Activity: Airport pickup and Dal Lake Shikara ride
- Meal: Dinner

**Day 2:** Srinagar Local Sightseeing
- Activity: Mughal Gardens, Dal Lake
- Meal: Breakfast, Dinner

**Day 3:** Gulmarg Day Trip
- Activity: Gondola ride, snow activities
- Meal: Breakfast, Dinner

**Day 4:** Pahalgam Excursion
- Activity: Betaab Valley, Aru Valley
- Meal: Breakfast, Dinner

**Day 5:** Departure
- Activity: Drop at airport
- Meal: Breakfast

#### Step 3: Create Variants

Click on the **Variants** tab (with sparkles icon ✨)

##### Variant 1: Luxury Package
1. Click "Add Variant"
2. Fill details:
   - **Name:** Luxury Package
   - **Description:** Experience Kashmir in ultimate luxury with 5-star hotels
   - **Price Modifier:** 25000 (₹25,000 extra per person)
   - **Mark as Default:** No

3. Assign Hotels (Day-wise):
   - **Day 1:** The LaLiT Grand Palace Srinagar (5★)
   - **Day 2:** The LaLiT Grand Palace Srinagar (5★)
   - **Day 3:** The LaLiT Grand Palace Srinagar (5★)
   - **Day 4:** The LaLiT Grand Palace Srinagar (5★)

##### Variant 2: Premium Package
1. Click "Add Variant"
2. Fill details:
   - **Name:** Premium Package
   - **Description:** Comfortable 4-star accommodation with excellent amenities
   - **Price Modifier:** 12000 (₹12,000 extra per person)
   - **Mark as Default:** No

3. Assign Hotels:
   - **Day 1:** Hotel Broadway (4★)
   - **Day 2:** Hotel Broadway (4★)
   - **Day 3:** Hotel Broadway (4★)
   - **Day 4:** Hotel Broadway (4★)

##### Variant 3: Standard Package
1. Click "Add Variant"
2. Fill details:
   - **Name:** Standard Package
   - **Description:** Budget-friendly 3-star hotels with all basic amenities
   - **Price Modifier:** 0 (Base price)
   - **Mark as Default:** Yes ✓

3. Assign Hotels:
   - **Day 1:** Hotel Grand Mamta (3★)
   - **Day 2:** Hotel Grand Mamta (3★)
   - **Day 3:** Hotel Grand Mamta (3★)
   - **Day 4:** Hotel Grand Mamta (3★)

#### Step 4: Save and Verify

1. Click **Save** button
2. Check browser console for logs:
   ```
   [VARIANTS] Processing 3 package variants
   [VARIANTS] Deleted existing variants
   [VARIANTS] Created variant: Luxury Package
   [VARIANTS] Created 4 hotel mappings for variant: Luxury Package
   [VARIANTS] Created variant: Premium Package
   [VARIANTS] Created 4 hotel mappings for variant: Premium Package
   [VARIANTS] Created variant: Standard Package
   [VARIANTS] Created 4 hotel mappings for variant: Standard Package
   [VARIANTS] Successfully saved all package variants
   ```

3. Verify success message appears
4. **Reload the page**
5. Navigate back to **Variants** tab
6. ✅ All 3 variants should be visible
7. ✅ All hotels should be pre-selected for each day
8. ✅ Standard Package should be marked as default

---

## Test Scenario 2: Edit Existing Variants

### Prerequisites
Complete Test Scenario 1 first

### Steps

1. Open the Kashmir Paradise Tour package
2. Navigate to **Variants** tab
3. **Modify Luxury Package:**
   - Change price modifier to 30000
   - Change Day 3 hotel to a different 5-star option
4. **Remove Premium Package:**
   - Click "Remove Variant" on Premium Package
5. **Add new Variant:**
   - Name: "Super Deluxe Package"
   - Price Modifier: 40000
   - Assign top-tier hotels
6. **Save** the form
7. **Reload** the page
8. **Verify:**
   - ✅ Luxury Package shows new price (30000)
   - ✅ Luxury Package Day 3 shows new hotel
   - ✅ Premium Package is gone
   - ✅ Super Deluxe Package appears
   - ✅ Standard Package unchanged

---

## Test Scenario 3: Backward Compatibility

### Test Without Variants

1. Create a new tour package query
2. Fill in all basic details
3. Add itinerary (3-4 days)
4. **Do NOT add any variants**
5. Save the package
6. ✅ Should save successfully
7. ✅ No console errors
8. Reload the package
9. Navigate to Variants tab
10. ✅ Tab should be empty
11. ✅ No errors displayed

### Add Variants Later

1. Using the package from above
2. Navigate to Variants tab
3. Add 2 variants (Luxury & Standard)
4. Assign hotels
5. Save
6. ✅ Variants save successfully
7. ✅ Can reload and see variants

---

## Test Scenario 4: Copy Hotels Feature

### Prerequisites
- Package with 5-day itinerary
- 3 variants created
- First variant has all hotels assigned

### Steps

1. Open the package
2. Navigate to Variants tab
3. Scroll to second variant
4. Click **"Copy hotels from [First Variant Name]"**
5. ✅ All hotel selections should copy instantly
6. Change one hotel selection manually
7. Scroll to third variant
8. Click **"Copy hotels from [Second Variant Name]"**
9. ✅ Should copy the modified selections
10. Save and verify persistence

---

## Test Scenario 5: Validation Testing

### Test Required Fields

1. Create new tour package
2. Navigate to Variants tab
3. Click "Add Variant"
4. Leave **Name** field empty
5. Try to save
6. ✅ Should show validation error: "Variant name is required"
7. Fill in name
8. Save
9. ✅ Should save successfully

### Test Hotel Selection (Optional)

1. Create variant
2. Don't assign any hotels
3. Save
4. ✅ Should save successfully (hotels are optional)
5. Reload
6. ✅ Variant exists but no hotels selected

---

## Test Scenario 6: Multiple Packages with Variants

### Test Data Isolation

1. Create Package A with 2 variants (Lux, Standard)
2. Save Package A
3. Create Package B with 3 variants (Deluxe, Premium, Basic)
4. Save Package B
5. Open Package A
6. ✅ Should show only 2 variants (Lux, Standard)
7. Open Package B
8. ✅ Should show only 3 variants (Deluxe, Premium, Basic)
9. ✅ No data mixing between packages

---

## Test Scenario 7: Performance Testing

### Large Package Test

1. Create package with **10-day itinerary**
2. Create **5 variants**
3. Assign different hotels for all 10 days in each variant
4. Total operations: 50 hotel mappings
5. Save
6. ✅ Should complete within 5 seconds
7. ✅ Check console for all logs
8. Reload
9. ✅ All data should load correctly

---

## Expected Console Logs

### Successful Save Operation
```
[VARIANTS] Processing 3 package variants
[VARIANTS] Deleted existing variants
[VARIANTS] Created variant: Luxury Package
[VARIANTS] Created 5 hotel mappings for variant: Luxury Package
[VARIANTS] Created variant: Premium Package  
[VARIANTS] Created 5 hotel mappings for variant: Premium Package
[VARIANTS] Created variant: Standard Package
[VARIANTS] Created 5 hotel mappings for variant: Standard Package
[VARIANTS] Successfully saved all package variants
```

### Error Handling (Simulated)
```
[VARIANTS] Processing 2 package variants
[VARIANTS] Deleted existing variants
[VARIANT_SAVE_ERROR] Error: Database connection timeout
Note: Main package still saves, variants fail gracefully
```

---

## UI Elements to Verify

### Variants Tab
- ✅ Sparkles icon appears on tab
- ✅ Tab is 10th position (after all other tabs)
- ✅ "Add Variant" button visible when no variants
- ✅ Multiple variants stack vertically

### Variant Card
- ✅ Shows variant number (Variant #1, #2, etc.)
- ✅ Name input field
- ✅ Description textarea
- ✅ Price modifier number input
- ✅ Default toggle switch
- ✅ Remove button (red, right side)
- ✅ Hotel assignment section

### Hotel Selection
- ✅ Each itinerary day shows as collapsible
- ✅ Day number and title displayed
- ✅ Hotel dropdown with search
- ✅ Selected hotel shows:
  - Hotel image thumbnail
  - Hotel name
  - Location
  - Star rating
  - View details link

### Copy Feature
- ✅ "Copy hotels from..." button shows for variants 2+
- ✅ Dropdown lists all previous variants
- ✅ Copy action is instant (no save needed)
- ✅ Visual feedback on copy

---

## Browser Console Commands for Testing

### Check Prisma Models
```javascript
// Open browser console on the page
// These should exist in window scope if exposed
console.log('Testing variant save...');
```

### Monitor Network Requests
1. Open DevTools → Network tab
2. Filter: `tourPackageQuery`
3. Save form
4. Look for PATCH request
5. Check request payload includes `packageVariants` array
6. Check response includes saved variants

### Inspect Form Data
```javascript
// In browser console when form is loaded
// This shows current form state
const form = document.querySelector('form');
console.log('Form data:', new FormData(form));
```

---

## Database Verification

### Using Prisma Studio

```bash
npx prisma studio
```

1. Open **PackageVariant** model
2. Find your test records
3. Verify fields:
   - ✅ name matches
   - ✅ description matches  
   - ✅ priceModifier is correct
   - ✅ isDefault is correct
   - ✅ tourPackageQueryId matches

4. Open **VariantHotelMapping** model
5. Filter by packageVariantId
6. Verify mappings:
   - ✅ Each day has mapping
   - ✅ hotelId is correct
   - ✅ itineraryId is correct

### Using Direct SQL

```sql
-- Check variants for a package
SELECT * FROM PackageVariant 
WHERE tourPackageQueryId = 'YOUR_PACKAGE_ID';

-- Check hotel mappings
SELECT 
  pv.name as variant_name,
  i.title as day_title,
  h.name as hotel_name
FROM VariantHotelMapping vhm
JOIN PackageVariant pv ON vhm.packageVariantId = pv.id
JOIN Itinerary i ON vhm.itineraryId = i.id
JOIN Hotel h ON vhm.hotelId = h.id
WHERE pv.tourPackageQueryId = 'YOUR_PACKAGE_ID'
ORDER BY pv.sortOrder, i.dayNumber;
```

---

## Common Issues & Solutions

### Issue 1: "packageVariant does not exist on PrismaClient"
**Solution:** Run `npx prisma generate` to regenerate client

### Issue 2: Variants not loading on form
**Solution:** 
- Check GET request includes `packageVariants` in include
- Verify API returns variants in response
- Check browser console for errors

### Issue 3: Variants save but don't persist
**Solution:**
- Check PATCH handler has variant save logic
- Verify `packageVariants` is in body destructuring
- Check database for records

### Issue 4: Hotel images not showing
**Solution:**
- Verify GET includes: `hotel: { include: { images: true }}`
- Check hotel has images in database
- Verify image URL is valid

### Issue 5: Copy hotels button not working
**Solution:**
- Verify source variant has hotel mappings
- Check hotelMappings object structure
- Ensure itineraryIds match

---

## Testing Checklist

### Before Testing
- [ ] Database schema pushed (`npx prisma db push`)
- [ ] Prisma client generated (`npx prisma generate`)
- [ ] Development server running (`npm run dev`)
- [ ] Test hotels exist in database
- [ ] Test hotels have images

### Feature Testing
- [ ] Create package with variants
- [ ] Save and reload - data persists
- [ ] Edit variant details
- [ ] Add/remove variants
- [ ] Copy hotels between variants
- [ ] Assign hotels for each day
- [ ] Set default variant
- [ ] Price modifiers display correctly

### Validation Testing
- [ ] Variant name required
- [ ] Hotel selection optional
- [ ] Form submits with/without variants
- [ ] Error messages clear

### Integration Testing
- [ ] Variants don't affect other tabs
- [ ] Can save package without variants
- [ ] Backward compatibility maintained
- [ ] No console errors

### Performance Testing
- [ ] Large packages (10+ days) work
- [ ] Multiple variants (5+) work
- [ ] Save completes in <5 seconds
- [ ] Load completes in <3 seconds

---

## Success Criteria

### ✅ All tests pass when:
1. Can create package with multiple variants
2. Variants save and reload correctly
3. Hotels display with images
4. Copy feature works
5. Validation prevents invalid data
6. Backward compatibility maintained (packages without variants still work)
7. No console errors during operation
8. Database records created correctly
9. Performance is acceptable
10. UI is responsive and intuitive

---

**Happy Testing! 🎉**

If you encounter any issues not covered here, check the implementation documentation in `PACKAGE_VARIANTS_INTEGRATION_COMPLETE.md`.
