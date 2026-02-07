# Classic Mode Default Fix

## Issue
Tour Package and Tour Package Query should both open in Classic Mode by default instead of WYSIWYG mode.

## Solution
Changed the default mode from 'wysiwyg' to 'classic' for the Tour Package form component.

## Files Modified
- `src/app/(dashboard)/tourPackages/[tourPackageId]/components/tourPackage-form.tsx`
  - Line 90: Changed `useState<'classic' | 'wysiwyg'>('wysiwyg')` to `useState<'classic' | 'wysiwyg'>('classic')`

## Current State
Both components now default to Classic Mode:

1. **Tour Package** (`tourPackage-form.tsx`)
   - Default mode: `'classic'` ✅
   - User can switch to WYSIWYG/PDF Preview Mode via UI toggle

2. **Tour Package Query** (`tourpackagequery-form-wrapper.tsx`)
   - Default mode: `'classic'` ✅ (was already correct)
   - User can switch to WYSIWYG/PDF Preview Mode via UI toggle

## Testing
To verify the change:
1. Navigate to any Tour Package edit page
2. Verify the page opens in Classic Form mode (not PDF Preview Mode)
3. Verify the "Classic Form" button is highlighted/selected by default
4. Verify you can still switch to WYSIWYG mode using the toggle buttons

## Impact
- Users will now see the Classic Form editor by default for both Tour Packages and Tour Package Queries
- The change only affects the initial state; users can still toggle between modes
- No data or functionality is affected, only the default UI presentation
