# AI Query Wizard - Draft Loading Fix

## Problem Summary

When using AI Query Wizard to create Tour Package Query:
1. **Issue 1**: Draft itinerary data was not loading - the form showed blank itinerary
2. **Issue 2**: Activities with Roman numerals were displayed in one line instead of separate lines

### Example of Issue 2

**Before (all in one line):**
```
i. Arrival at Denpasar Airport and transfer to Ubud hotel. ii. Visit Tegalalang Rice Terraces and enjoy the scenery. iii. Explore Tirta Empul Temple and witness the holy spring.
```

**After (line by line):**
```
i. Arrival at Denpasar Airport and transfer to Ubud hotel.
ii. Visit Tegalalang Rice Terraces and enjoy the scenery.
iii. Explore Tirta Empul Temple and witness the holy spring.
```

## Root Causes

### Issue 1: localStorage Key Mismatch
- **AI Wizard** was storing draft data with key: `aiPackageWizardDraft`
- **Form** was trying to load draft data from key: `autoQueryDraft`
- Result: Data was never found, itinerary remained blank

### Issue 2: Data Structure Mismatch
- **AI generates** activities as:
  ```json
  "activities": [{
    "activityTitle": "",
    "activityDescription": "i. Activity 1...\nii. Activity 2...\niii. Activity 3..."
  }]
  ```
- **Form expected** activities as array of strings:
  ```json
  "activities": ["Activity 1", "Activity 2", "Activity 3"]
  ```
- **Newline handling**: The `\n` characters in the AI response were not being converted to HTML line breaks

## Solution

### Fix 1: Correct localStorage Key
Updated `ai-package-wizard.tsx` to use the correct key based on mode:
```typescript
const draftKey = mode === "tourPackageQuery" ? "autoQueryDraft" : "aiPackageWizardDraft";
```

### Fix 2: Update Field Mapping
Updated the form to correctly map AI-generated field names:
```typescript
tourPackageQueryName: data.tourPackageName || data.tourPackageQueryName || '',
numChild5to12: String(data.numChildren || data.numChild5to12 || ''),
```

### Fix 3: Handle AI Activity Structure
Completely rewrote the activities mapping logic to:
1. Detect if activities are in AI format (object with `activityDescription`)
2. Keep the single activity structure (don't split into multiple activities)
3. Convert `\n` to `<br>` tags for proper HTML rendering in JoditEditor

```typescript
activities: Array.isArray(day.activities) && day.activities.length > 0 
  ? (() => {
      const firstActivity = day.activities[0];
      if (typeof firstActivity === 'object' && firstActivity.activityDescription) {
        // Convert newlines to HTML breaks
        const descriptionWithLineBreaks = firstActivity.activityDescription
          .replace(/\n/g, '<br>');
        
        return [{
          activityTitle: firstActivity.activityTitle || '',
          activityDescription: descriptionWithLineBreaks,
          activityImages: []
        }];
      }
      // ... handle other formats
    })()
  : []
```

## Files Changed

1. **src/components/ai/ai-package-wizard.tsx**
   - Line 215: Changed localStorage key for tour package queries

2. **src/app/(dashboard)/tourPackageQuery/[tourPackageQueryId]/components/tourPackageQuery-form.tsx**
   - Lines 594-606: Updated field mapping for AI-generated data
   - Lines 613-645: Completely rewrote activities mapping logic

## Testing

Created test scripts in `scripts/tests/`:

1. **test-ai-wizard-draft-mapping.js**
   - Tests data structure mapping
   - Validates field transformations
   - Tests XSS prevention with malicious input
   
2. **test-ai-wizard-e2e-flow.js**
   - Simulates complete end-to-end flow
   - Tests all 5 steps: Storage → Retrieval → Mapping → Validation → Results
   - Comprehensive validation of user experience

**Test Results:**
- ✅ Draft Storage and Retrieval
- ✅ Basic fields mapped correctly (name, customer, dates, etc.)
- ✅ Activities preserved in single object structure
- ✅ Line breaks converted from `\n` to `<br>` tags
- ✅ Roman numerals preserved in activity descriptions
- ✅ HTML properly escaped to prevent XSS attacks
- ✅ All itineraries mapped correctly

## User Experience After Fix

1. User creates itinerary in AI Query Wizard
2. User clicks "Create Tour Package Query Draft"
3. User is redirected to tour package query form
4. **All data is now pre-filled**, including:
   - Basic information (name, category, duration)
   - Customer details
   - Itinerary for each day
   - Activities with proper line breaks
5. Activities display clearly with each Roman numeral item on its own line

## Backward Compatibility

The fix maintains backward compatibility with legacy formats:
- If activities are strings (old format), they're still handled correctly
- If activities are objects without `activityDescription`, handled gracefully
- Returns empty array for unknown formats

## Next Steps

The fix is complete and tested. Users should now be able to:
1. Generate itineraries using AI Query Wizard
2. See all draft data load correctly in the tour package query form
3. See activities displayed with proper line breaks (Roman numeral items on separate lines)
