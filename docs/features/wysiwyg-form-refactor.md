# Tour Package Query WYSIWYG Form Refactor

## Overview
Refactored the Tour Package Query WYSIWYG form to display data in a PDF-like view with Edit functionality for each section, matching the styling and layout of the PDF generator.

## Changes Made

### 1. Added Edit State Management
- Added `editingSection` state to track which section is currently being edited
- Default state is `null`, meaning all sections show display view

### 2. Enhanced PDFLikeSection Component
- Added `action` prop to support custom action buttons (Edit button)
- Maintains the same visual styling with brand colors

### 3. Created Display Components
- **DataDisplayRow**: Simple key-value display with border
- **InfoCard**: Card-style display for important information (matching PDF style)
- **InfoCardGrid**: Grid layout for InfoCards

### 4. Refactored Sections

#### Basic Information
- **Display View**: Shows query number, name, type, customer details, associate partner, and template info
- **Edit View**: Opens BasicInfoTab component

#### Guest Information
- **Display View**: Shows traveler counts (Adults, Children 5-12, Children 0-5) in large numbers
- **Edit View**: Opens GuestsTab component

#### Tour Information
- **Display View**: Shows destination, duration, transport, pickup/drop locations in styled cards
- **Edit View**: Opens LocationTab component

#### Dates & Duration
- **Display View**: Shows travel dates in a styled panel with FROM → TO format
- **Edit View**: Opens DatesTab component

#### Itinerary Details
- **Display View**: Shows day-by-day summary with day number badge, hotel info, and room count
- **Edit View**: Opens full ItineraryTab component

#### Hotel Details
- **Display View**: Shows hotel cards with images, names, day numbers, and room allocation counts
- **Edit View**: Opens HotelsTab component

#### Flight Details
- **Display View**: Shows flights in a table format with flight name/number, route, time, and date
- **Edit View**: Opens FlightsTab component

#### Pricing Details
- **Display View**: Shows pricing items in styled cards with name, price (₹), and description. Also shows total price in highlighted card
- **Edit View**: Opens PricingTab component

#### Policies & Terms
- **Display View**: Shows preview of first 2-3 items from inclusions, exclusions, important notes, and cancellation policy with "more" indicator
- **Edit View**: Opens full PoliciesTab component with all policy fields

## Brand Colors Used
All display components use the same brand colors as the PDF generator:
- Primary: `#DC2626` (Red)
- Secondary: `#EA580C` (Orange)
- Accent: `#F97316` (Bright Orange)
- Panel Background: `#FFF8F5`
- Table Header: `#FFF3EC`
- Success: `#059669` (Green - for pricing)
- Text: `#1F2937`
- Muted: `#6B7280`
- Border: `#E5E7EB`

## User Experience
1. **Initial View**: Users see a clean, PDF-like display of all their data
2. **Edit Action**: Click "Edit" button on any section to expand the edit form
3. **Close Action**: Click "Close" (or "Edit" again) to return to display view
4. **Data Preservation**: All form data is maintained via react-hook-form's `watch()` function

## Benefits
1. **Better Visual Context**: Users can see their data in the final PDF format while editing
2. **Reduced Cognitive Load**: No need to expand accordions to see data
3. **Consistent Styling**: Display matches PDF output exactly
4. **Easier Review**: Users can quickly scan all sections without expanding
5. **Selective Editing**: Only the section being edited shows the form fields

## Technical Implementation
- Uses React's `useState` to track editing state
- Leverages `form.watch()` to display real-time form values
- Conditional rendering: Display view vs Edit view based on `editingSection` state
- No accordion component needed - cleaner UI with direct Edit buttons
- All existing form functionality preserved (validation, submission, etc.)

## File Location
`src/app/(dashboard)/(routes)/tourpackagequeryfrominquiry/[inquiryId]/components/tourpackagequery-form-wysiwyg.tsx`

## Testing Recommendations
1. Test all sections can be edited and saved
2. Verify display updates when form values change
3. Test form validation still works
4. Ensure PDF generation matches display view
5. Test with empty data (should show "Not specified" or similar messages)

## Future Enhancements
1. Add keyboard shortcuts (e.g., Escape to close edit mode)
2. Add "Edit All" button to open all sections at once
3. Add auto-save when closing edit mode
4. Add print view button to preview exact PDF output
