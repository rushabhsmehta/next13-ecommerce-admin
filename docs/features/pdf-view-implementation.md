# PDF View Mode - Technical Implementation

## Overview

This document describes the technical implementation of the PDF View Mode feature in Tour Package and Tour Package Query forms.

## Architecture

### Component Hierarchy

```
TourPackageForm / TourPackageQueryForm (Wrapper)
  ├─ Mode Selector (Classic / PDF Preview)
  │
  ├─ TourPackageFormClassic / TourPackageQueryFormClassic
  │   └─ Traditional form layout
  │
  └─ TourPackageFormWYSIWYG / TourPackageQueryFormWYSIWYG
      ├─ Display Helper Components
      │   ├─ PDFLikeSection
      │   ├─ DataDisplayRow
      │   ├─ InfoCard
      │   └─ InfoCardGrid
      │
      └─ Sections (with display/edit toggle)
          ├─ Tour Information
          ├─ Hotel Allocations / Guest Information
          ├─ Destination / Tour Information
          ├─ Itinerary Details / Dates
          ├─ Flight Details
          ├─ Pricing
          ├─ Policies & Terms
          └─ Package Variants (Tour Package only)
```

## Display Helper Components

### PDFLikeSection

Wrapper component for each section with consistent styling.

**Props:**
- `title: string` - Section title
- `children: React.ReactNode` - Section content
- `className?: string` - Additional CSS classes
- `icon?: any` - Lucide icon component
- `action?: React.ReactNode` - Action buttons (Edit button)

**Usage:**
```tsx
<PDFLikeSection 
  title="Basic Information" 
  icon={FileText}
  action={
    <Button onClick={() => setEditingSection('basic-info')}>
      Edit
    </Button>
  }
>
  {/* Content */}
</PDFLikeSection>
```

**Styling:**
- Border color: `#E5E7EB`
- Background: `#FFFFFF`
- Header background: `#FFF3EC`
- Icon color: `#EA580C`

### DataDisplayRow

Displays label-value pairs in a horizontal layout with separator.

**Props:**
- `label: string` - Field label
- `value?: string | number` - Field value (optional)
- `className?: string` - Additional CSS classes

**Behavior:**
- Returns `null` if value is empty
- Displays border-bottom separator

**Usage:**
```tsx
<DataDisplayRow 
  label="Query Number" 
  value={form.watch('tourPackageQueryNumber')} 
/>
```

### InfoCard

Displays information in a card with brand styling and left border accent.

**Props:**
- `label: string` - Field label
- `value?: string | number` - Field value (optional)

**Behavior:**
- Returns `null` if value is empty
- Shows label in uppercase with muted color
- Shows value in bold with primary text color

**Usage:**
```tsx
<InfoCard 
  label="TOUR NAME" 
  value={form.watch('tourPackageName')} 
/>
```

**Styling:**
- Background: `#FFF8F5`
- Border left: 4px solid `#DC2626`
- Label color: `#6B7280`
- Value color: `#1F2937`

### InfoCardGrid

Layout component for arranging InfoCards in a 2-column grid.

**Props:**
- `children: React.ReactNode` - InfoCard components

**Usage:**
```tsx
<InfoCardGrid>
  <InfoCard label="ADULTS" value={form.watch('numAdults')} />
  <InfoCard label="CHILDREN" value={form.watch('numChild5to12')} />
</InfoCardGrid>
```

## State Management

### Editing State

Each WYSIWYG form maintains an `editingSection` state:

```typescript
const [editingSection, setEditingSection] = useState<string | null>(null);
```

**Possible values:**
- `null` - No section is being edited (all sections show display view)
- `'tourInfo'` - Tour Information section is being edited
- `'hotels'` - Hotels section is being edited
- `'destination'` - Destination section is being edited
- `'itinerary'` - Itinerary section is being edited
- `'flights'` - Flights section is being edited
- `'pricing'` - Pricing section is being edited
- `'policies'` - Policies section is being edited
- `'variants'` - Variants section is being edited (Tour Package only)
- `'basic-info'` - Basic Info section is being edited (Tour Package Query only)
- `'guests'` - Guests section is being edited (Tour Package Query only)
- `'dates'` - Dates section is being edited (Tour Package Query only)

### Mode State

The wrapper component maintains a `mode` state:

```typescript
const [mode, setMode] = useState<'classic' | 'wysiwyg'>('wysiwyg');
```

**Default:**
- Tour Package: `'wysiwyg'` (PDF Preview Mode)
- Tour Package Query: `'classic'` (Classic Form)

## Section Implementation Pattern

Each section follows this consistent pattern:

```tsx
<PDFLikeSection 
  title="Section Title"
  icon={IconComponent}
  action={
    !readOnly && (
      <Button 
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setEditingSection(
          editingSection === 'sectionId' ? null : 'sectionId'
        )}
        className="flex items-center gap-2"
      >
        <Edit className="h-4 w-4" />
        {editingSection === 'sectionId' ? 'Close' : 'Edit'}
      </Button>
    )
  }
>
  {editingSection !== 'sectionId' ? (
    // Display View
    <div className="space-y-4">
      <InfoCardGrid>
        <InfoCard label="FIELD 1" value={form.watch('field1')} />
        <InfoCard label="FIELD 2" value={form.watch('field2')} />
      </InfoCardGrid>
      {/* Additional display elements */}
    </div>
  ) : (
    // Edit View
    <div className="space-y-4">
      {/* Form fields using FormField, FormItem, etc. */}
    </div>
  )}
</PDFLikeSection>
```

## Brand Colors

All display components use consistent brand colors:

```typescript
const brandColors = {
  primary: "#DC2626",      // Red
  secondary: "#EA580C",    // Orange
  accent: "#F97316",       // Light Orange
  light: "#FEF2F2",        // Light Red
  lightOrange: "#FFF7ED",  // Light Orange Background
  text: "#1F2937",         // Dark Gray
  muted: "#6B7280",        // Medium Gray
  white: "#FFFFFF",        // White
  border: "#E5E7EB",       // Light Gray Border
  success: "#059669",      // Green
  panelBg: "#FFF8F5",      // Light Panel Background
  subtlePanel: "#FFFDFB",  // Subtle Panel Background
  tableHeaderBg: "#FFF3EC" // Table Header Background
};
```

## Data Binding

Display views use `form.watch()` to reactively display current form values:

```tsx
<InfoCard 
  label="TOUR NAME" 
  value={form.watch('tourPackageName')} 
/>
```

**Benefits:**
- Automatic updates when form values change
- No need for manual state synchronization
- Works seamlessly with React Hook Form

**Caution:**
- `form.watch()` causes re-renders when watched fields change
- Avoid watching too many fields in a single component
- Use within display views only (not in edit views)

## Read-Only Mode

When `readOnly` prop is `true`:
- Edit buttons are hidden (`!readOnly &&` condition)
- All sections show in display mode only
- Form fields in edit views are disabled

**Implementation:**
```tsx
action={
  !readOnly && (
    <Button onClick={...}>Edit</Button>
  )
}
```

## Conditional Display

Display components handle empty values gracefully:

```tsx
const InfoCard = ({ label, value }: { label: string, value?: string | number }) => {
  if (!value) return null; // Don't render if no value
  return (
    // Render component
  );
};
```

**Benefits:**
- Cleaner display (no empty fields)
- Better user experience
- Automatic handling of optional fields

## Section-Specific Implementations

### Tour Package Query

**Basic Information Section:**
- Query number, name, type
- Customer name and number
- Associate partner
- Template used

**Guests Section:**
- Adults count
- Children (5-12) count
- Children (0-5) count
- Displayed in centered cards with large numbers

**Tour Information Section:**
- Location/destination
- Transport type
- Pickup and drop locations
- Duration

**Dates Section:**
- Tour start date
- Tour end date
- Period

**Itinerary Section:**
- Day-wise summary cards
- Day number badge
- Title and location
- Hotel name with image
- Room allocations count
- Transport details count

**Hotels Section:**
- Hotel cards with images
- Location information
- Total rooms allocation

**Flights Section:**
- Flight table with all segments
- From/To locations
- Departure/Arrival times
- Flight numbers

**Pricing Section:**
- Pricing items in cards
- Name, price, description
- Total price if available

**Policies Section:**
- Count-based display (e.g., "5 items")
- Inclusions, Exclusions
- Payment Terms, Cancellation Policy
- Additional policies summary

### Tour Package

**Tour Information Section:**
- Package name
- Duration
- Tour images gallery
- Type and category
- Featured status badge

**Hotel Allocations Section:**
- Selected hotels list
- Hotel images
- Day numbers assigned

**Destination Section:**
- Location name
- Location details

**Itinerary Section:**
- Day-wise cards
- Day number, title
- Location and hotel
- Meals included
- Images preview (first 3)

**Flight Details Section:**
- Flight table
- From/To, times
- Flight names and numbers
- Duration

**Pricing Section:**
- Pricing items cards
- Name, price, description

**Policies Section:**
- Counts for each policy type
- Additional policies summary

**Package Variants Section:**
- Variant cards
- Variant name
- Pricing tier
- Hotel mappings count

## File Structure

```
src/app/(dashboard)/
├── tourPackages/[tourPackageId]/components/
│   ├── tourPackage-form.tsx              # Wrapper with mode selector
│   ├── tourPackage-form-classic.tsx      # Classic form view
│   └── tourPackage-form_wysiwyg.tsx      # PDF Preview view
│
└── (routes)/tourpackagequeryfrominquiry/[inquiryId]/components/
    ├── tourpackagequery-form.tsx         # Re-exports wrapper
    ├── tourpackagequery-form-wrapper.tsx # Wrapper with mode selector
    ├── tourpackagequery-form-classic.tsx # Classic form view
    └── tourpackagequery-form-wysiwyg.tsx # PDF Preview view
```

## Dependencies

- React Hook Form - Form management and validation
- Lucide React - Icons
- Tailwind CSS - Styling utilities
- shadcn/ui - UI components (Button, Card, etc.)

## Performance Considerations

1. **form.watch() Usage:**
   - Only watch fields needed for display
   - Avoid watching large arrays or objects
   - Consider using `form.watch('fieldName')` instead of `form.watch()` without arguments

2. **Conditional Rendering:**
   - Use `if (!value) return null` in display components
   - Reduces unnecessary DOM nodes
   - Improves rendering performance

3. **Image Loading:**
   - Images in display views load on-demand
   - Consider lazy loading for image galleries
   - Use appropriate image sizes

## Testing Recommendations

1. **Unit Tests:**
   - Test display components render correctly
   - Test edit button toggle functionality
   - Test read-only mode behavior

2. **Integration Tests:**
   - Test mode switching (Classic ↔ PDF Preview)
   - Test section editing flow
   - Test form submission from both modes

3. **E2E Tests:**
   - Test complete form creation workflow
   - Test data persistence across mode switches
   - Test validation in both modes

## Future Enhancements

1. **Collapsible Sections:**
   - Add ability to collapse/expand sections in display view
   - Save section state in localStorage

2. **Print Preview:**
   - Add "Print Preview" button
   - Generate print-friendly view

3. **PDF Export:**
   - Add "Export to PDF" button in preview mode
   - Use existing PDF generator logic

4. **Comparison View:**
   - Show side-by-side comparison of before/after changes
   - Highlight modified fields

5. **Section Validation:**
   - Show validation status per section
   - Add visual indicators for incomplete sections
