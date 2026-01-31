# Hotel Pricing Dashboard

## Overview

The Hotel Pricing Dashboard is a centralized interface for managing hotel pricing across all hotels in the system. Instead of navigating to individual hotel pages to manage pricing, users can now select any hotel from a dropdown and immediately view and manage all its pricing configurations in one place.

## Location

**Route**: `/hotel-pricing`

**Navigation**: Configuration → Hotel Pricing Dashboard

## Features

### 1. Hotel Selection
- **Dropdown selector** showing all hotels with their location and destination information
- Format: `{Hotel Name} - {Location} ({Destination})`
- Example: "Grand Hotel - Goa (North Goa)"

### 2. Dynamic Pricing Display
- Pricing table appears automatically when a hotel is selected
- Shows all pricing periods for the selected hotel
- Displays:
  - Date range (Start Date to End Date)
  - Room Type
  - Occupancy Type
  - Meal Plan (optional)
  - Price in INR

### 3. CRUD Operations

#### Add Pricing Period
1. Select a hotel
2. Click "Add Pricing Period" button
3. Fill in the form:
   - **Start Date**: Beginning of pricing period
   - **End Date**: End of pricing period
   - **Room Type**: Type of room (e.g., Deluxe, Suite)
   - **Occupancy Type**: Number of persons (e.g., Single, Double)
   - **Price**: Price per night in INR
   - **Meal Plan**: Optional meal plan (e.g., CP, MAP, AP)
4. Click "Create"

#### Edit Pricing Period
1. Click the edit icon (pencil) next to any pricing entry
2. Modify the fields as needed
3. Click "Update"

#### Delete Pricing Period
1. Click the delete icon (trash) next to any pricing entry
2. Confirm deletion

## Schema Integration

The dashboard uses the existing `HotelPricing` model from Prisma:

```prisma
model HotelPricing {
  id              String         @id @default(uuid())
  hotelId         String
  startDate       DateTime
  endDate         DateTime
  price           Float
  isActive        Boolean        @default(true)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @default(now())
  mealPlanId      String?
  occupancyTypeId String?
  roomTypeId      String?
  hotel           Hotel          @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  roomType        RoomType?      @relation(fields: [roomTypeId], references: [id])
  occupancyType   OccupancyType? @relation(fields: [occupancyTypeId], references: [id])
  mealPlan        MealPlan?      @relation(fields: [mealPlanId], references: [id])
}
```

## API Endpoints Used

The dashboard integrates with existing API endpoints:

- `GET /api/hotels/{hotelId}/pricing` - Fetch all pricing periods for a hotel
- `POST /api/hotels/{hotelId}/pricing` - Create new pricing period
- `PATCH /api/hotels/{hotelId}/pricing/{pricingId}` - Update existing pricing period
- `DELETE /api/hotels/{hotelId}/pricing/{pricingId}` - Delete pricing period

## Technical Implementation

### Architecture

**Server Component** (`page.tsx`):
- Fetches all hotels with locations and destinations
- Fetches configuration data (room types, occupancy types, meal plans)
- Passes data to client component

**Client Component** (`components/client.tsx`):
- Handles user interactions
- Manages state for hotel selection and pricing periods
- Performs API calls for CRUD operations
- Validates form inputs using Zod schema

### Key Technologies

- **Next.js 13 App Router**: Server/Client component pattern
- **React Hook Form**: Form state management and validation
- **Zod**: Schema validation
- **Axios**: HTTP client for API calls
- **Shadcn UI**: UI components (Select, Dialog, Table, Form, etc.)
- **date-fns**: Date formatting
- **Timezone Utils**: UTC/Local conversion for date handling

### Form Validation

```typescript
const pricingFormSchema = z.object({
  startDate: z.date({ required_error: "Start date is required" }),
  endDate: z.date({ required_error: "End date is required" }),
  roomTypeId: z.string({ required_error: "Room type is required" }),
  occupancyTypeId: z.string({ required_error: "Occupancy type is required" }),
  price: z.coerce.number().min(0, { message: "Price must be at least 0" }),
  mealPlanId: z.string().optional(),
}).refine(
  (values) => values.endDate >= values.startDate,
  { message: "End date must be after start date", path: ["endDate"] }
)
```

### Timezone Handling

The dashboard uses the project's timezone utilities to ensure dates are stored and displayed correctly:

- **`dateToUtc(date)`**: Converts local dates to UTC before saving to database
- **`utcToLocal(date)`**: Converts UTC dates from database to local for display
- **`formatLocalDate(date, format)`**: Formats dates with timezone awareness

## User Flow

1. **Navigate** to Configuration → Hotel Pricing Dashboard
2. **Select** a hotel from the dropdown
3. **View** existing pricing periods (if any)
4. **Add** new pricing periods as needed
5. **Edit** existing periods by clicking the edit icon
6. **Delete** outdated periods by clicking the delete icon

## Benefits Over Previous Approach

### Before
- Navigate to Hotels list
- Find and click on a specific hotel
- Click on "Pricing" or similar option
- Manage pricing for that hotel only
- Return to hotels list to select another hotel

### After (Hotel Pricing Dashboard)
- Navigate directly to Hotel Pricing Dashboard
- Select any hotel from dropdown
- Immediately view and manage all pricing
- Switch between hotels without navigation
- Faster workflow for managing multiple hotels

## Error Handling

The dashboard includes comprehensive error handling:

- **Form Validation**: Client-side validation with helpful error messages
- **API Errors**: Toast notifications for failed operations
- **Loading States**: Visual feedback during data fetching
- **Empty States**: Helpful messages when no data exists

## Future Enhancements

Potential improvements for future iterations:

1. **Bulk Import**: CSV/Excel import for multiple pricing periods
2. **Copy Pricing**: Copy pricing from one hotel to another
3. **Date Range Conflicts**: Visual warnings for overlapping date ranges
4. **Pricing Templates**: Predefined pricing templates (High Season, Low Season, etc.)
5. **Analytics**: Visual charts showing pricing distribution over time
6. **Search & Filter**: Filter pricing by date range, room type, or occupancy
7. **Batch Operations**: Select multiple pricing periods for bulk edit/delete

## Related Files

- `/src/app/(dashboard)/hotel-pricing/page.tsx` - Server component
- `/src/app/(dashboard)/hotel-pricing/components/client.tsx` - Client component
- `/src/components/app-sidebar.tsx` - Navigation (updated with new link)
- `/src/app/api/hotels/[hotelId]/pricing/route.ts` - GET/POST API
- `/src/app/api/hotels/[hotelId]/pricing/[pricingId]/route.ts` - PATCH/DELETE API

## Testing

A test script is available to validate the implementation:

```bash
node /tmp/test-hotel-pricing-dashboard.js
```

This validates:
- File structure
- Component exports
- API integration
- Form schema
- Timezone handling
- Navigation updates
