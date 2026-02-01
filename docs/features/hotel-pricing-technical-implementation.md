# Hotel Pricing Dashboard - Technical Implementation

## Overview

This document describes the technical implementation of the enhanced hotel pricing dashboard with Google Sheets-like interface and automatic period splitting.

## Architecture

### Component Structure

```
src/app/(dashboard)/hotel-pricing/
├── page.tsx                              # Server component - data fetching
├── components/
│   ├── client.tsx                        # Main client component with UI logic
│   └── pricing-split-dialog.tsx          # Split confirmation dialog

src/app/api/hotels/[hotelId]/pricing/
├── route.ts                              # GET and POST endpoints
├── [pricingId]/route.ts                  # GET, PATCH, DELETE for specific pricing
└── check-overlap/route.ts                # POST endpoint for overlap detection
```

### Data Flow

```
User Action → Client Component → API Route → Prisma → Database
     ↑                                                      │
     └──────────────── Response ─────────────────────────┘
```

## Key Components

### 1. Server Component (`page.tsx`)

**Purpose**: Fetch initial data on the server for optimal performance

**Data Fetched**:
- Locations (active only)
- Hotels (all, with relations)
- Room Types (active only)
- Occupancy Types (active only, sorted by rank)
- Meal Plans (active only)

**Why Server-Side**:
- Reduces client bundle size
- Faster initial page load
- Better SEO
- Secure data access

### 2. Client Component (`client.tsx`)

**State Management**:

```typescript
const [selectedLocationId, setSelectedLocationId] = useState<string>("")
const [selectedHotelId, setSelectedHotelId] = useState<string>("")
const [pricingPeriods, setPricingPeriods] = useState<PricingPeriod[]>([])
const [editingRow, setEditingRow] = useState<EditingRow | null>(null)
const [splitPreview, setSplitPreview] = useState<PricingSplitPreview | null>(null)
```

**Key Features**:

1. **Hierarchical Filtering**
   - Location selection filters available hotels
   - Hotel selection triggers pricing fetch
   - Auto-reset on location change

2. **Inline Editing**
   - Single editing row at a time
   - All fields editable in place
   - Date pickers integrated in table cells
   - Save/Cancel actions inline

3. **Optimistic UI Updates**
   - Loading states
   - Disabled states during operations
   - Immediate feedback

### 3. Split Confirmation Dialog (`pricing-split-dialog.tsx`)

**Visual Design**:

- **Amber Alert**: Shows affected existing periods
- **Green Alert**: Shows resulting periods
- **Info Alert**: Explains what will happen
- **Color-coded badges**: NEW (green), PRESERVED (blue)

**Data Structure**:

```typescript
interface PricingSplitPreview {
  willSplit: boolean;
  affectedPeriods: Array<{
    id: string;
    startDate: Date | string;
    endDate: Date | string;
    price: number;
    roomType: string;
    occupancy: string;
    mealPlan?: string;
  }>;
  resultingPeriods: Array<{
    startDate: Date | string;
    endDate: Date | string;
    price: number;
    isNew: boolean;
    isExisting: boolean;
  }>;
  message: string;
}
```

## API Endpoints

### 1. Check Overlap Endpoint

**Route**: `POST /api/hotels/[hotelId]/pricing/check-overlap`

**Purpose**: Preview what will happen if pricing is added

**Request Body**:
```json
{
  "startDate": "2024-07-01",
  "endDate": "2024-09-30",
  "roomTypeId": "room-123",
  "occupancyTypeId": "occ-456",
  "mealPlanId": "meal-789",
  "price": 7000,
  "excludeId": "optional-id-to-exclude"
}
```

**Response**:
```json
{
  "willSplit": true,
  "affectedPeriods": [...],
  "resultingPeriods": [...],
  "message": "Found 1 overlapping pricing period(s)..."
}
```

**Algorithm**:

1. Find overlapping periods matching room type, occupancy, and meal plan
2. For each overlapping period:
   - Calculate "before" segment (if period starts before new start)
   - Calculate "after" segment (if period ends after new end)
3. Add the new period
4. Sort all resulting periods by start date
5. Return preview

### 2. Create Pricing with Split

**Route**: `POST /api/hotels/[hotelId]/pricing`

**Request Body** (with split):
```json
{
  "startDate": "2024-07-01",
  "endDate": "2024-09-30",
  "roomTypeId": "room-123",
  "occupancyTypeId": "occ-456",
  "mealPlanId": "meal-789",
  "price": 7000,
  "applySplit": true
}
```

**Transaction Flow**:

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Find overlapping periods
  const overlappingPeriods = await tx.hotelPricing.findMany({...})
  
  // 2. For each overlapping period:
  for (const period of overlappingPeriods) {
    // 2a. Delete the original
    await tx.hotelPricing.delete({ where: { id: period.id } })
    
    // 2b. Create before segment (if exists)
    if (periodStart < newStart) {
      await tx.hotelPricing.create({...})
    }
    
    // 2c. Create after segment (if exists)
    if (periodEnd > newEnd) {
      await tx.hotelPricing.create({...})
    }
  }
  
  // 3. Create the new pricing period
  await tx.hotelPricing.create({...})
})
```

**Why Transaction**:
- Atomicity: All changes succeed or all fail
- Consistency: No partial updates
- Isolation: Other requests don't see intermediate states
- Durability: Changes are permanent once committed

## Period Splitting Algorithm

### Core Logic

```typescript
function splitPeriod(
  existingStart: Date,
  existingEnd: Date,
  newStart: Date,
  newEnd: Date
) {
  const segments = [];
  
  // Before segment
  if (existingStart < newStart) {
    segments.push({
      start: existingStart,
      end: dayBefore(newStart),
      type: 'PRESERVED'
    });
  }
  
  // Middle segment (new pricing)
  segments.push({
    start: newStart,
    end: newEnd,
    type: 'NEW'
  });
  
  // After segment
  if (existingEnd > newEnd) {
    segments.push({
      start: dayAfter(newEnd),
      end: existingEnd,
      type: 'PRESERVED'
    });
  }
  
  return segments;
}
```

### Edge Cases Handled

1. **New period fully inside existing**
   ```
   Existing: |-----------|
   New:         |---|
   Result:   |--|---|---|
   ```

2. **New period partially overlaps start**
   ```
   Existing:    |--------|
   New:      |-----|
   Result:   |--|-----|
   ```

3. **New period partially overlaps end**
   ```
   Existing: |--------|
   New:           |-----|
   Result:   |---|-----|
   ```

4. **New period fully covers existing**
   ```
   Existing:    |-----|
   New:      |-----------|
   Result:   |-----------|
   ```

5. **Multiple overlapping periods**
   ```
   Existing: |-----|  |-----|
   New:         |--------|
   Result:   |--|--------|--|
   ```

## Timezone Handling

### Problem

Date-only fields (startDate, endDate) were being shifted due to timezone conversion:
- User selects: July 1, 2024
- Stored as: June 30, 2024 23:00:00 UTC (if in +01:00 timezone)
- Displayed as: June 30, 2024

### Solution

Use `dateToUtc()` and `utcToLocal()` utilities:

```typescript
// Storing
const startDate = dateToUtc(selectedDate)
await prisma.hotelPricing.create({
  data: { startDate, ... }
})

// Retrieving
const pricing = await prisma.hotelPricing.findMany({...})
const displayDate = utcToLocal(pricing.startDate)
```

**How it Works**:

```typescript
export function dateToUtc(date: Date | string): Date | null {
  if (!date) return null;
  const d = new Date(date);
  return new Date(Date.UTC(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    0, 0, 0, 0
  ));
}

export function utcToLocal(utcDate: Date | string): Date | null {
  if (!utcDate) return null;
  const d = new Date(utcDate);
  return new Date(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    0, 0, 0, 0
  );
}
```

## UI/UX Design Decisions

### 1. Location → Hotel Hierarchy

**Why**: 
- Prevents selecting wrong hotel
- Reduces cognitive load
- Natural workflow
- Matches user mental model

### 2. Inline Editing in Table

**Why**:
- Faster than modal dialogs
- Spreadsheet-like familiarity
- Context remains visible
- Less clicking

**Trade-offs**:
- Limited space for large forms
- Can only edit one row at a time
- Solution: Use selects and compact date pickers

### 3. Automatic Period Splitting

**Why**:
- Eliminates manual calculation
- Prevents errors
- Saves time
- Handles complex scenarios

**Safety Measures**:
- Preview before applying
- Detailed explanation
- Clear visual feedback
- Reversible (can edit/delete after)

### 4. Google Sheets-Like Styling

**Design Elements**:
- Compact table rows
- Inline form controls
- Row highlighting on edit
- Action buttons in rightmost column
- Horizontal scrolling for overflow
- Header row with background color

## Performance Considerations

### 1. Server-Side Data Fetching

- Initial data loaded on server
- Reduces client JavaScript
- Faster Time to Interactive (TTI)

### 2. Selective Re-fetching

- Only fetch pricing when hotel changes
- Don't re-fetch on every action
- Use local state for editing

### 3. Optimistic Updates

- Show loading states
- Disable buttons during operations
- Prevent duplicate submissions

### 4. Database Indexes

Ensure indexes exist on:
```sql
CREATE INDEX idx_hotel_pricing_hotel ON HotelPricing(hotelId);
CREATE INDEX idx_hotel_pricing_dates ON HotelPricing(startDate, endDate);
CREATE INDEX idx_hotel_pricing_attributes ON HotelPricing(roomTypeId, occupancyTypeId, mealPlanId);
```

## Testing Strategy

### 1. Unit Tests

Test the splitting algorithm in isolation:
- Single overlap scenarios
- Multiple overlaps
- Edge cases (full coverage, partial overlap, etc.)
- Date boundary conditions

### 2. Integration Tests

Test API endpoints:
- Check overlap detection
- Transaction rollback on error
- Concurrent requests
- Invalid data handling

### 3. E2E Tests

Test full user workflows:
- Add pricing with no overlap
- Add pricing with overlap and confirm
- Edit existing pricing
- Delete pricing
- Location and hotel filtering

### 4. Manual Testing

- Test with real data
- Verify date display
- Check different timezones
- Test on mobile devices

## Security Considerations

### 1. Authentication

All API routes require Clerk authentication:
```typescript
const { userId } = auth();
if (!userId) {
  return new NextResponse("Unauthorized", { status: 401 });
}
```

### 2. Authorization

Check user has permission to modify pricing:
```typescript
const userRole = await getUserOrgRole();
if (!roleAtLeast(userRole, 'admin')) {
  return new NextResponse("Forbidden", { status: 403 });
}
```

### 3. Input Validation

Validate all inputs:
- Date ranges (end >= start)
- Price (>= 0)
- Required fields
- ID format

### 4. SQL Injection Prevention

Prisma ORM provides:
- Parameterized queries
- Type safety
- Input sanitization

## Future Enhancements

### Potential Features

1. **Bulk Operations**
   - Copy pricing from one hotel to another
   - Apply same pricing to multiple hotels
   - Bulk date adjustments

2. **Import/Export**
   - Excel import
   - CSV export
   - Template download

3. **Pricing History**
   - Track changes over time
   - Who made what changes
   - Restore previous pricing

4. **Advanced Filtering**
   - Filter by date range
   - Filter by price range
   - Search by attributes

5. **Pricing Analytics**
   - Average prices by season
   - Price trends over time
   - Occupancy vs pricing correlation

6. **Validation Rules**
   - Minimum price thresholds
   - Maximum increase limits
   - Required coverage periods

## Maintenance

### Database Migrations

When updating the schema:

1. Create migration
   ```bash
   npx prisma migrate dev --name add_hotel_pricing_feature
   ```

2. Update Prisma client
   ```bash
   npx prisma generate
   ```

3. Update TypeScript interfaces
4. Test thoroughly before deploying

### Monitoring

Monitor:
- API response times
- Error rates
- Transaction failures
- User feedback

### Backup Strategy

- Regular database backups
- Point-in-time recovery capability
- Test restore procedures
- Document recovery process

## Conclusion

This implementation provides a robust, user-friendly hotel pricing management system with:

- Intuitive Google Sheets-like interface
- Automatic period splitting with confirmation
- Safe, atomic database operations
- Comprehensive error handling
- Timezone-aware date handling
- Extensible architecture

The system handles complex pricing scenarios while maintaining data integrity and providing excellent user experience.
