# Multi-Variant Tour Package Design

## Overview
Enable tour packages to have multiple variants (Luxury, Premium, Standard, etc.) that share the same itinerary but have different hotels for each day.

## Current Architecture Analysis

### Current Structure:
- **Itinerary** model has a **single `hotelId`** per day
- Each itinerary day can only have one hotel
- Problem: Cannot offer multiple package tiers with different hotels

## Proposed Solution

### Approach: Package Variants with Hotel Mappings

We'll introduce a **PackageVariant** model that allows:
- Multiple variants per tour package/query
- Each variant has its own set of hotel assignments per day
- Common itinerary is shared across all variants
- Pricing can differ per variant

### Database Schema Changes

#### 1. New Model: `PackageVariant`
```prisma
model PackageVariant {
  id                   String                  @id @default(uuid())
  name                 String                  // "Luxury", "Premium", "Standard"
  description          String?                 @db.Text
  tourPackageId        String?
  tourPackageQueryId   String?
  isDefault            Boolean                 @default(false)
  sortOrder            Int                     @default(0)
  priceModifier        Float?                  // % increase/decrease from base
  createdAt            DateTime                @default(now())
  updatedAt            DateTime                @updatedAt
  
  // Relations
  tourPackage          TourPackage?            @relation(fields: [tourPackageId], references: [id], onDelete: Cascade)
  tourPackageQuery     TourPackageQuery?       @relation(fields: [tourPackageQueryId], references: [id], onDelete: Cascade)
  variantHotelMappings VariantHotelMapping[]
  
  @@index([tourPackageId])
  @@index([tourPackageQueryId])
  @@index([sortOrder])
}
```

#### 2. New Model: `VariantHotelMapping`
Maps each variant to specific hotels for each day:
```prisma
model VariantHotelMapping {
  id                String          @id @default(uuid())
  packageVariantId  String
  itineraryId       String          // Links to the common itinerary day
  hotelId           String
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  
  // Relations
  packageVariant    PackageVariant  @relation(fields: [packageVariantId], references: [id], onDelete: Cascade)
  itinerary         Itinerary       @relation(fields: [itineraryId], references: [id], onDelete: Cascade)
  hotel             Hotel           @relation(fields: [hotelId], references: [id])
  
  @@unique([packageVariantId, itineraryId]) // One hotel per variant per day
  @@index([packageVariantId])
  @@index([itineraryId])
  @@index([hotelId])
}
```

#### 3. Update Existing Models
Add relations to TourPackage and TourPackageQuery:
```prisma
model TourPackage {
  // ... existing fields
  packageVariants   PackageVariant[]
}

model TourPackageQuery {
  // ... existing fields
  packageVariants   PackageVariant[]
}

model Itinerary {
  // ... existing fields
  variantHotelMappings VariantHotelMapping[]
}

model Hotel {
  // ... existing fields
  variantHotelMappings VariantHotelMapping[]
}
```

## Implementation Steps

### Phase 1: Database Migration
1. Create new Prisma models
2. Run migration
3. Create seed data for variant types

### Phase 2: API Layer
1. **GET /api/package-variants/[id]** - Get variants for a package
2. **POST /api/package-variants** - Create new variant
3. **PATCH /api/package-variants/[id]** - Update variant
4. **DELETE /api/package-variants/[id]** - Delete variant
5. **POST /api/package-variants/[id]/hotel-mappings** - Bulk update hotel mappings

### Phase 3: UI Components

#### A. New Tab: "Package Variants"
Location: Tour Package Query Form
Features:
- Add/Remove variants
- Set variant name, description
- Configure price modifier
- Set default variant

#### B. Enhanced Hotels Tab
Current: Single hotel per day
New: Multi-variant hotel assignment

**View Modes:**
1. **Single Variant Mode** (Default - Backward Compatible)
   - Show as it is now
   - Uses the `hotelId` field on Itinerary

2. **Multi-Variant Mode** (New)
   - Switch between variants using tabs/dropdown
   - Assign different hotels for each variant
   - Visual comparison view showing all variants side-by-side

**UI Layout:**
```
┌─────────────────────────────────────────────┐
│ Variants: [Luxury] [Premium] [Standard] [+] │
├─────────────────────────────────────────────┤
│ Day 1: Srinagar                             │
│   Luxury:   [The LaLiT Grand Palace ▼]     │
│   Premium:  [Vivanta Dal View      ▼]      │
│   Standard: [Hotel City Star       ▼]      │
├─────────────────────────────────────────────┤
│ Day 2: Gulmarg                              │
│   Luxury:   [The Khyber Resort     ▼]      │
│   Premium:  [Hotel Highlands Park  ▼]      │
│   Standard: [Pine Palace Resort    ▼]      │
└─────────────────────────────────────────────┘
```

### Phase 4: Display & PDF Generation

#### Tour Package Display
- Variant selector at the top
- Show itinerary with hotels based on selected variant
- Compare variants side-by-side option

#### PDF Generation
Options:
1. Generate per variant
2. Generate combined PDF with all variants
3. Generate comparison table

## Data Flow

### Creating a Multi-Variant Package

```typescript
// 1. Create base tour package with itineraries
const tourPackage = await createTourPackage({
  name: "Kashmir Paradise 7N/8D",
  itineraries: [
    { dayNumber: 1, location: "Srinagar", activities: [...] },
    { dayNumber: 2, location: "Gulmarg", activities: [...] },
    // ... more days
  ]
});

// 2. Create variants
const luxuryVariant = await createVariant({
  tourPackageId: tourPackage.id,
  name: "Luxury",
  priceModifier: 50, // 50% more expensive
});

const premiumVariant = await createVariant({
  tourPackageId: tourPackage.id,
  name: "Premium",
  priceModifier: 25,
});

const standardVariant = await createVariant({
  tourPackageId: tourPackage.id,
  name: "Standard",
  priceModifier: 0,
  isDefault: true,
});

// 3. Map hotels to variants for each day
await createVariantHotelMappings({
  variantId: luxuryVariant.id,
  mappings: [
    { itineraryId: day1.id, hotelId: lalitPalace.id },
    { itineraryId: day2.id, hotelId: khyberResort.id },
  ]
});
```

## Backward Compatibility

### Existing Packages
- Continue to use `itinerary.hotelId` 
- If no variants exist, display single hotel mode
- Migration path: Convert existing to "Standard" variant

### Gradual Rollout
1. Make variants **optional**
2. Default to single-hotel mode
3. Enable multi-variant only when variants are created
4. UI detects variant presence and switches mode automatically

## Benefits

1. **Flexibility**: Offer multiple tiers without duplicating itineraries
2. **Maintainability**: Update common itinerary once, applies to all variants
3. **Customer Choice**: Clients can choose based on budget
4. **Upselling**: Easy to show upgrade options
5. **Reporting**: Compare bookings across variants

## Example Use Case: Kashmir Tour

**Common Itinerary:**
- Day 1: Arrival Srinagar → Shikara Ride → Mughal Gardens
- Day 2: Srinagar → Gulmarg → Gondola Ride
- Day 3: Gulmarg → Pahalgam
- Day 4: Pahalgam → Betaab Valley → Aru Valley
- ...

**Hotels by Variant:**

| Day | Location  | Luxury                | Premium              | Standard           |
|-----|-----------|------------------------|----------------------|--------------------|
| 1-2 | Srinagar  | The LaLiT Grand Palace | Vivanta Dal View     | Hotel City Star    |
| 3   | Gulmarg   | The Khyber Resort      | Hotel Highlands Park | Pine Palace Resort |
| 4-5 | Pahalgam  | WelcomHotel Pine N Peak| Hotel Heevan         | Hotel Paradise     |

## Next Steps

1. Review and approve design
2. Create Prisma schema updates
3. Generate migration
4. Implement API endpoints
5. Build UI components
6. Test with sample data
7. Update documentation

---

**Status**: Design Phase - Awaiting Approval
**Author**: AI Assistant
**Date**: October 2, 2025
