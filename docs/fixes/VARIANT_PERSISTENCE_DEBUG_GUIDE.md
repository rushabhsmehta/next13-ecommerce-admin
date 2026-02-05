# 🐛 Variant Selection Persistence - Debug Guide

## Quick Test Steps

### 1. **Test Variant Selection**
1. Navigate to Tour Package Query (create or edit)
2. Open browser DevTools Console (F12)
3. Select a location in Basic Info tab
4. Select a tour package
5. Select one or more variants
6. Watch console for these logs:
   ```
   🎯 [BasicInfoTab] Variant selection changed: {...}
   🎯 [Form] handleTourPackageVariantSelection called: {...}
   📝 [Form] Set selectedVariantIds in form: [...]
   ✅ [Form] Variant selection complete
   ```

### 2. **Test Save Operation**
1. After selecting variants, click "Save changes" or "Create"
2. Watch console for:
   ```
   📤 [onSubmit] Submitting form data: {
     selectedVariantIds: [...],
     variantHotelOverrides: {...},
     ...
   }
   ```
3. Verify the API request in Network tab:
   - Method: POST `/api/tourPackageQuery` OR PATCH `/api/tourPackageQuery/[id]`
   - Check request payload includes `selectedVariantIds` and `variantHotelOverrides`

### 3. **Test Load Operation**
1. After saving, navigate away (e.g., back to inquiries list)
2. Re-open the same Tour Package Query
3. Watch console for:
   ```
   🔍 [BasicInfoTab] Component mounted/updated: {
     formVariantIds: [...],
     watchedVariantIds: [...],
     availableVariantsCount: X
   }
   ```
4. **Expected Result:** Variant badges should appear in the dropdown button
5. **If Failed:** Watch for:
   ```
   ⚠️ [BasicInfoTab] Variant selection mismatch detected, forcing sync
   ```

## Console Commands for Manual Testing

### Check Current Form State
```javascript
// Paste in console
const form = document.querySelector('form');
const buttons = form.querySelectorAll('button[role="combobox"]');
console.log('Variant button text:', buttons[1]?.textContent);
```

### Check Local Storage
```javascript
// Check autosave data
Object.keys(localStorage)
  .filter(k => k.startsWith('tourPackageQuery_autosave'))
  .forEach(key => {
    const data = JSON.parse(localStorage.getItem(key));
    console.log(key, data.data.selectedVariantIds);
  });
```

### Verify API Response
```javascript
// After page load, check network requests
// Look for: GET /api/tourPackageQuery/[id]
// In response, verify:
{
  "id": "...",
  "selectedVariantIds": ["variant-1-id", "variant-2-id"],
  "variantHotelOverrides": {},
  ...
}
```

## Known Issues & Fixes

### Issue 1: Variants not showing after save
**Symptoms:**
- Variants are selected before save
- After save/reload, dropdown shows "Select variants to compare"
- Console shows `formVariantIds: []` or `null`

**Root Causes:**
1. ❌ API not saving `selectedVariantIds`
2. ❌ API not returning `selectedVariantIds` in GET response
3. ❌ Form defaultValues not mapping from initialData
4. ❌ Form watch() not triggering on mount

**Fixes Applied:**
✅ Added `useEffect` in BasicInfoTab to force sync on mount
✅ Added logging throughout the data flow
✅ Verified API endpoints save/load the fields

### Issue 2: Variants showing wrong count
**Symptoms:**
- Form says 2 variants selected
- UI only shows 1 badge

**Fix:**
✅ Added mismatch detection in BasicInfoTab useEffect

### Issue 3: Cannot select variants
**Symptoms:**
- Clicking variants in dropdown doesn't work
- No console logs appear

**Debug Steps:**
1. Check if `handleTourPackageVariantSelection` is passed to BasicInfoTab
2. Verify tourPackageTemplate has a value
3. Check if availableVariants array is populated

## Files Modified

### 1. `BasicInfoTab.tsx`
- ✅ Added `useEffect` to sync variant selection on mount
- ✅ Added logging for variant selection changes
- ✅ Added mismatch detection and auto-fix

### 2. `tourPackageQuery-form.tsx`
- ✅ Added detailed logging in `handleTourPackageVariantSelection`
- ✅ Added logging in `onSubmit` to verify data being sent
- ✅ Already had proper defaultValues mapping (no changes needed)

### 3. `route.ts` (API)
- ✅ Already properly saving `selectedVariantIds` (line 435 in POST, lines 651-652 in PATCH)
- ✅ Already returning data in GET (includes all fields)

## Next Steps if Issue Persists

1. **Enable form debug mode:**
   ```typescript
   // Add to tourPackageQuery-form.tsx, inside component:
   useEffect(() => {
     if (typeof window !== 'undefined') {
       (window as any).debugForm = form;
       console.log('🐛 Form debugging enabled. Access via window.debugForm');
     }
   }, [form]);
   ```

2. **Check database directly:**
   ```sql
   SELECT id, tourPackageQueryName, selectedVariantIds, variantHotelOverrides 
   FROM TourPackageQuery 
   WHERE id = 'your-query-id';
   ```

3. **Test with fresh query:**
   - Create new Tour Package Query
   - Select variants
   - Save
   - Check if issue reproduces

4. **Clear cache:**
   - Hard refresh (Ctrl+Shift+R)
   - Clear localStorage
   - Try in incognito mode

## Success Criteria

✅ After selecting variants and saving:
1. Variants appear as badges in dropdown button
2. QueryVariantsTab shows selected variants
3. Console logs show consistent data throughout flow
4. API request/response includes variant data
5. Reloading page preserves selections

---

*Last Updated: 2026-02-05*
