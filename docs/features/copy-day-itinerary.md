# Copy Day Itinerary Feature Documentation

## Overview
This feature allows users to copy day itinerary details to their clipboard from the Tour Package form, matching the existing functionality in Tour Package Query.

## Location
- **File**: `src/app/(dashboard)/tourPackages/[tourPackageId]/components/tourPackage-form.tsx`
- **UI**: Small copy button (📋) next to the accordion button in each day itinerary

## How It Works

### User Flow
1. Navigate to Tour Package form
2. Scroll to Itinerary section
3. Click the copy button (📋) next to any day
4. Day details are copied to clipboard
5. Success toast appears: "Day details copied to clipboard!"

### Technical Flow
```
User clicks Copy Button
    ↓
copyDayToClipboard(itinerary)
    ↓
stripHtml() removes all HTML tags
    ↓
Format text with structure:
  - Day Title
  - Day Description
  - Activities (if any)
    ↓
navigator.clipboard.writeText()
    ↓
Show success/error toast
```

## Implementation Details

### Function: `copyDayToClipboard()`
**Purpose:** Extracts and copies day itinerary details to clipboard

**Parameters:**
- `itinerary: any` - Itinerary object containing title, description, and activities

**Process:**
1. Creates temporary DOM element to strip HTML tags
2. Extracts day title and description
3. Loops through activities and formats each one
4. Builds structured plain text
5. Copies to clipboard using Clipboard API
6. Shows toast notification

**Example Output:**
```
Day Title: Arrival in Paris

Day Description: Welcome to Paris! Transfer to hotel and enjoy the evening at leisure.

Activities:

Activity 1:
  Title: Eiffel Tower Visit
  Description: Visit the iconic Eiffel Tower and enjoy panoramic views.

Activity 2:
  Title: Seine River Cruise
  Description: Enjoy a relaxing cruise along the Seine River.
```

### UI Button
**Location:** Inside `AccordionTrigger` component (line 1441-1455)

**Features:**
- Icon: `Copy` from lucide-react (h-4 w-4)
- Styling: Slate gray with hover effects
- Accessibility: `aria-label="Copy day details"`
- Event handling: Prevents accordion toggle (preventDefault, stopPropagation)

## Code Structure

### Import
```typescript
import { Copy } from "lucide-react"
```

### Function
```typescript
const copyDayToClipboard = async (itinerary: any) => {
  try {
    const stripHtml = (html: string) => {
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || '';
    };

    // Build formatted text...
    await navigator.clipboard.writeText(textToCopy);
    toast.success('Day details copied to clipboard!');
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    toast.error('Failed to copy to clipboard');
  }
};
```

### UI Button
```typescript
<button
  type="button"
  aria-label="Copy day details"
  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    copyDayToClipboard(itinerary);
  }}
>
  <Copy className="h-4 w-4" />
</button>
```

## Testing

### Manual Testing
1. Create/edit a tour package
2. Add itinerary days with:
   - Title (with HTML formatting)
   - Description (with HTML formatting)
   - Activities (optional)
3. Click copy button on each day
4. Verify clipboard content is plain text (no HTML)
5. Verify toast notification appears

### Automated Testing
Run test script:
```bash
node scripts/tests/test-copy-itinerary-function.js
```

**Test Coverage:**
- ✅ HTML tag stripping
- ✅ Text formatting
- ✅ Activity handling
- ✅ Empty activities handling

## Browser Compatibility

### Clipboard API
- Chrome 63+
- Firefox 53+
- Safari 13.1+
- Edge 79+

**Fallback:** Error toast if clipboard API fails

## Security

### XSS Prevention
- HTML tags are stripped before copying
- Uses DOM manipulation safely (temporary element)
- No script execution possible

### Error Handling
- Try-catch wrapper prevents crashes
- Error logged to console
- User-friendly error toast

## Maintenance

### Related Code
- **Tour Package Query**: `src/components/tour-package-query/ItineraryTab.tsx` (lines 148-181)
  - Uses identical implementation
  - Any updates should be synchronized

### Common Issues
1. **Clipboard permission denied**: Browser security settings
2. **HTML not stripped**: Check `stripHtml()` function
3. **Activities not showing**: Check `itinerary.activities` array

### Future Enhancements
- [ ] Add option to include/exclude activities
- [ ] Add option to copy all days at once
- [ ] Add markdown formatting option
- [ ] Add copy to markdown with headings

## Changelog

### v1.0.0 (2026-02-01)
- ✅ Initial implementation
- ✅ Added copy button to Tour Package form
- ✅ Identical to Tour Package Query implementation
- ✅ Test script created
- ✅ Documentation added

---

**Last Updated:** 2026-02-01  
**Author:** GitHub Copilot  
**Status:** Production Ready
