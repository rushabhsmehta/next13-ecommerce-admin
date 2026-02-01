# Tour Package Query: Classic & PDF View Feature

## Overview
This feature adds a view switcher to Tour Package Query creation/editing, allowing users to toggle between:
- **Classic Form View**: Traditional tabbed interface for efficient data entry
- **PDF Preview Mode**: A WYSIWYG view that matches the actual PDF download appearance

This brings Tour Package Query editing to parity with Tour Package editing, which already had this functionality.

## Implementation Summary

### Files Created/Modified

#### New Files
1. **tourpackagequery-form-wrapper.tsx** - Main wrapper component with view switcher
2. **tourpackagequery-form-classic.tsx** - Classic tabbed form view (renamed from original)
3. **tourpackagequery-form-wysiwyg.tsx** - New PDF preview/WYSIWYG view

#### Modified Files
1. **tourpackagequery-form.tsx** - Now just re-exports the wrapper component

### Architecture

```
tourpackagequery-form.tsx (re-export)
    ↓
tourpackagequery-form-wrapper.tsx (view switcher)
    ├─→ Classic Form (tourpackagequery-form-classic.tsx)
    └─→ PDF Preview (tourpackagequery-form-wysiwyg.tsx)
```

## Feature Details

### View Switcher
Located at the top of the form with two buttons:
- **Classic Form**: Traditional multi-tab interface (default)
- **PDF Preview Mode**: Shows sections as they appear in the PDF download

Users receive a confirmation prompt when switching views warning that unsaved changes will be lost. Note: This does not preserve data between views - users should save their work before switching.

### Classic View (tourpackagequery-form-classic.tsx)
- Tab-based interface with 9 tabs:
  1. Basic Information
  2. Guests
  3. Location/Tour Info
  4. Dates
  5. Itinerary
  6. Hotels
  7. Flights
  8. Pricing
  9. Policies
- Uses shared tab components from `/src/components/tour-package-query/`
- Efficient for bulk data entry

### PDF Preview View (tourpackagequery-form-wysiwyg.tsx)
- Matches the visual design of `tourPackageQueryDisplay.tsx`
- Uses `PDFLikeSection` components with:
  - Gradient headers (orange-red theme)
  - Icons for each section
  - Consistent border and shadow styling
- Each section has a collapsible Accordion for editing
- When expanded, shows the same tab components as Classic view
- Provides "what you see is what you get" editing experience

### Styling
Brand colors matching the PDF display:
- Primary: `#DC2626` (red)
- Secondary: `#EA580C` (orange)
- Accent: `#F97316` (lighter orange)
- Table Header Background: `#FFF3EC` (light peach)

### Sections in PDF Preview
All sections use accordion-based editing:
1. **Basic Information** (FileText icon) - Package name, number, type, customer details
2. **Guest Information** (Users icon) - Adults, children counts
3. **Tour Information** (MapPin icon) - Location, duration, pickup/drop, transport
4. **Dates & Duration** (Calendar icon) - Tour dates, journey dates
5. **Itinerary Details** (ListPlus icon) - Day-by-day itinerary, activities, room allocations
6. **Hotel Details** (Building icon) - Hotel selections and room assignments
7. **Flight Details** (Plane icon) - Flight information
8. **Pricing Information** (Tag icon) - Pricing breakdown, variant comparison
9. **Policies** (ScrollText icon) - Inclusions, exclusions, terms, cancellation policy

## Technical Details

### Form State Management
Both views share:
- Same Zod validation schema
- Same form state (react-hook-form)
- Same API submission logic
- Same default values
- Same lookup data fetching (room types, meal plans, vehicle types)

### Data Flow
```typescript
// Form submission flow (identical in both views)
1. User fills form → form.handleSubmit()
2. Validation via Zod schema
3. Normalize dates using timezone-utils
4. POST to /api/tourPackageQuery
5. Success: redirect to tour package query display
6. Error: show toast notification
```

### Reusable Components
Both views use the same tab components:
- `BasicInfoTab`
- `GuestsTab`
- `LocationTab`
- `DatesTab`
- `ItineraryTab`
- `HotelsTab`
- `FlightsTab`
- `PricingTab`
- `PoliciesTab`

### Dynamic Imports
JoditEditor is dynamically imported to avoid SSR issues:
```typescript
const JoditEditor = dynamic(() => import("jodit-react"), { ssr: false });
```

## Usage

### For End Users
1. Navigate to Tour Package Query creation from an Inquiry
2. Choose between Classic Form or PDF Preview Mode using the toggle at the top
3. In PDF Preview:
   - Click on any section's accordion to expand and edit
   - See a live preview of how the PDF will look
   - Submit when ready
4. In Classic Form:
   - Use tabs to navigate between sections
   - More compact view for faster data entry

### For Developers
```typescript
// Import the form (wrapper is automatically used)
import { TourPackageQueryForm } from "./components/tourpackagequery-form"

// Use in page
<TourPackageQueryForm
  inquiry={inquiry}
  locations={locations}
  hotels={hotels}
  activitiesMaster={activitiesMaster}
  itinerariesMaster={itinerariesMaster}
  associatePartners={associatePartners}
  tourPackages={tourPackages}
  tourPackageQueries={tourPackageQueries}
/>
```

## Benefits

### User Experience
- **Flexibility**: Choose the view that fits your workflow
- **Preview**: See exactly how the PDF will look while editing
- **Confidence**: No surprises when downloading the PDF
- **Efficiency**: Classic view for speed, PDF view for accuracy

### Consistency
- Matches Tour Package editing experience
- Consistent with PDF download appearance
- Uses established design patterns from the codebase

### Maintainability
- Shared components reduce code duplication
- Single source of truth for form logic
- Easy to update both views by modifying shared tab components

## Future Enhancements (Optional)

### Tour Package WYSIWYG Improvements
The Tour Package PDF view could be enhanced to match the Query PDF styling:
- Add gradient headers to policy sections
- Use consistent icons across sections
- Match the exact card layouts from `tourPackageQueryDisplay.tsx`

### Additional Features
- Save draft functionality
- Auto-save on view switch
- Side-by-side comparison mode
- Export to different PDF templates

## Testing Checklist

- [ ] View switcher toggles correctly
- [ ] Confirmation dialog appears when switching views
- [ ] Form validation works in both views
- [ ] All sections expand/collapse in PDF view
- [ ] Data persists when switching views
- [ ] Form submission works from both views
- [ ] Lookup data loads correctly (room types, meal plans, etc.)
- [ ] Template loading works in both views
- [ ] No console errors
- [ ] Mobile responsive
- [ ] PDF preview matches actual PDF download

## Related Files
- `/src/app/(dashboard)/tourPackages/[tourPackageId]/components/tourPackage-form.tsx` - Tour Package wrapper (reference)
- `/src/app/(dashboard)/tourPackages/[tourPackageId]/components/tourPackage-form_wysiwyg.tsx` - Tour Package WYSIWYG (reference)
- `/src/app/(dashboard)/tourPackageQueryDisplay/[tourPackageQueryId]/components/tourPackageQueryDisplay.tsx` - PDF display styling reference
- `/src/components/tour-package-query/` - Shared tab components directory
