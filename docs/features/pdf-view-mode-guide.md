# PDF View Mode Guide

## Overview

Both Tour Package and Tour Package Query forms now have two viewing modes:
1. **Classic Form Mode** - Traditional form with all fields visible
2. **PDF Preview Mode** - Display-first view that matches the PDF download layout with section-by-section editing

## Features

### Mode Switching

At the top of both forms, you'll find a mode selector with two buttons:
- **Classic Form** - Shows all form fields in a traditional layout
- **PDF Preview Mode** - Shows a PDF-like preview with edit buttons

### PDF Preview Mode Benefits

1. **Visual Preview**: See your data exactly as it will appear in the PDF
2. **Cleaner Interface**: Information is displayed in an organized, PDF-like format
3. **Section-Based Editing**: Edit specific sections without cluttering the entire view
4. **Better UX**: Easier to review and verify information before submission

## How to Use PDF Preview Mode

### Tour Package Query

1. Navigate to create or edit a Tour Package Query
2. Click "PDF Preview Mode" button at the top
3. View all sections in a PDF-like layout:
   - **Basic Information**: Query details, customer info, associate partner
   - **Guest Information**: Traveler counts (adults, children)
   - **Tour Information**: Destination, transport, pickup/drop locations
   - **Dates & Duration**: Tour dates and period
   - **Itinerary Details**: Day-by-day itinerary with hotels and activities
   - **Hotel Details**: Hotels with images and room allocations
   - **Flight Details**: Flight information in table format
   - **Pricing Details**: Pricing breakdown
   - **Policies & Terms**: All policy information

4. Click "Edit" button on any section to modify it
5. Click "Close" to return to display view

### Tour Package

1. Navigate to create or edit a Tour Package
2. Click "PDF Preview Mode" button at the top
3. View all sections in a PDF-like layout:
   - **Tour Information**: Package name, duration, images, type, category
   - **Hotel Allocations**: Selected hotels for the package
   - **Destination**: Location details
   - **Itinerary Details**: Day-wise itinerary summary
   - **Flight Details**: Flight segments
   - **Pricing**: Pricing items
   - **Policies & Terms**: Inclusions, exclusions, cancellation policies
   - **Package Variants**: Variant configurations

4. Click "Edit" button on any section to modify it
5. Click "Close" to return to display view

## Display Components

The PDF Preview Mode uses specialized display components for consistent styling:

### DataDisplayRow
Displays label-value pairs with a horizontal layout:
```
Label: Value
```

### InfoCard
Displays information in a card format with brand styling:
```
┌──────────────┐
│ LABEL        │
│ Value        │
└──────────────┘
```

### InfoCardGrid
Arranges InfoCards in a 2-column grid for compact display.

## Styling

PDF Preview Mode uses brand colors consistent with the PDF generator:
- **Primary Color**: #DC2626 (Red)
- **Secondary Color**: #EA580C (Orange)
- **Accent Color**: #F97316
- **Panel Background**: #FFF8F5
- **Table Header**: #FFF3EC

## Read-Only Mode

When viewing in read-only mode (e.g., archived records):
- Edit buttons are hidden
- All sections show in display mode only
- Form fields are disabled in Classic mode

## Best Practices

1. **Review Before Submit**: Use PDF Preview Mode to review all information before creating/updating
2. **Edit One Section at a Time**: Focus on one section to avoid overwhelming the interface
3. **Check Visual Appearance**: Ensure data looks correct as it will in the final PDF
4. **Use Classic Mode for Bulk Editing**: If you need to edit many fields at once, Classic mode may be more efficient

## Technical Details

### Component Structure

Both forms use the same pattern:
```typescript
<PDFLikeSection 
  title="Section Title"
  icon={IconComponent}
  action={
    <Button onClick={() => setEditingSection(...)}>
      {editingSection === 'sectionId' ? 'Close' : 'Edit'}
    </Button>
  }
>
  {editingSection !== 'sectionId' ? (
    // Display View
    <DisplayComponents />
  ) : (
    // Edit View
    <EditForm />
  )}
</PDFLikeSection>
```

### State Management

Each form maintains an `editingSection` state to track which section is being edited:
```typescript
const [editingSection, setEditingSection] = useState<string | null>(null);
```

### Data Display

Display views use `form.watch()` to access current form values:
```typescript
<InfoCard label="QUERY NAME" value={form.watch('tourPackageQueryName')} />
```

## Troubleshooting

### Section Won't Edit
- Ensure you're not in read-only mode
- Try switching to Classic mode and back
- Refresh the page if the issue persists

### Display Not Updating
- Display views automatically update when form values change via `form.watch()`
- If values don't update, check browser console for errors
- Ensure form is properly initialized

### Styling Issues
- Clear browser cache if styling looks incorrect
- Check that all brand color variables are properly defined
- Ensure CSS is loading correctly

## Related Documentation

- [Tour Package Query PDF Generator](/docs/features/tour-package-query-pdf-generator.md)
- [Tour Package PDF Generator](/docs/features/tour-package-pdf-generator.md)
- [Form Validation Guide](/docs/guides/form-validation.md)
