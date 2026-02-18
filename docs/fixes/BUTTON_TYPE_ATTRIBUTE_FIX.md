# Button Type Attribute Fix

## Issue Description
Users reported that clicking "Copy All Rooms" button in tour package query variants tab caused the query to automatically save and exit edit mode unexpectedly.

## Root Cause
In HTML forms, `<button>` elements default to `type="submit"` when no type attribute is specified. This means any button click within a form will trigger form submission unless explicitly set to `type="button"`.

## Problem Details
In `QueryVariantsTab.tsx`, several action buttons were missing the explicit `type="button"` attribute:
- Copy Day 1 to All Days
- Copy Rooms
- Add Room
- Remove Room
- Add Transport
- Remove Transport
- Change Hotel (Edit/Save/Cancel)
- Remove Pricing Item

When users clicked these buttons, they inadvertently triggered the parent form's `onSubmit` handler, causing:
1. Form validation and submission
2. API call to save changes
3. Router navigation away from edit page
4. User being "thrown out" of edit mode

## Solution
Added `type="button"` attribute to all action buttons that should NOT submit the form.

### Files Modified
- `src/components/tour-package-query/QueryVariantsTab.tsx`

### Buttons Fixed (10 total)
```tsx
// Before
<Button onClick={() => copyFirstDayToAllDays(variant.id)}>
  Copy Day 1 to All Days
</Button>

// After
<Button type="button" onClick={() => copyFirstDayToAllDays(variant.id)}>
  Copy Day 1 to All Days
</Button>
```

## Button Type Best Practices

### When to use `type="button"`
Use `type="button"` for buttons that perform client-side actions:
- Add/Remove items from arrays
- Copy data between fields
- Toggle UI states
- Open/Close dialogs
- Navigation without form submission
- Any onClick handler that shouldn't submit the form

### When to use `type="submit"`
Use `type="submit"` for buttons that should submit the form:
- Save/Create buttons at the end of forms
- Search buttons in search forms
- Filter buttons that trigger server requests

### When to use `type="reset"`
Use `type="reset"` for buttons that should reset form to initial values:
- Clear/Reset buttons in forms

## Verification

### Before Fix
1. Open tour package query in edit mode
2. Click "Copy Rooms" button
3. ❌ Form automatically saves
4. ❌ User redirected away from edit page

### After Fix
1. Open tour package query in edit mode
2. Click "Copy Rooms" button
3. ✅ Rooms are copied
4. ✅ User remains in edit mode
5. ✅ Changes are not saved until user clicks "Save" button

## Testing Checklist
- [x] ESLint passes with no new warnings
- [x] TypeScript compilation successful
- [x] CodeQL security scan: 0 alerts
- [x] All 27 buttons in QueryVariantsTab.tsx have proper type attribute
- [x] Related files (HotelsTab, BasicInfoTab, etc.) verified safe

## Related Files Checked
✅ **Safe** - Already have proper button types:
- `src/components/tour-package-query/HotelsTab.tsx` - Copy buttons have `type="button"`
- `src/components/tour-package-query/BasicInfoTab.tsx` - Only Popover triggers (safe)
- `src/components/tour-package-query/LocationTab.tsx` - Only Popover triggers (safe)
- `src/components/tour-package-query/DatesTab.tsx` - Only Popover triggers (safe)
- `src/components/forms/*-form-dialog.tsx` - All action buttons have `type="button"`

## Future Prevention
When creating new buttons in forms:
1. Always specify the `type` attribute explicitly
2. Default to `type="button"` for action buttons
3. Only use `type="submit"` for actual form submission buttons
4. Test button behavior in forms to ensure no unintended submissions

## References
- [MDN: Button Type Attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#attr-type)
- [HTML Standard: Button Types](https://html.spec.whatwg.org/multipage/form-elements.html#attr-button-type)

## Date
February 18, 2026

## Related Issues
- User report: "clicking copy all rooms causes auto-save and exit from edit mode"
- Component: Tour Package Query - Variants Tab
