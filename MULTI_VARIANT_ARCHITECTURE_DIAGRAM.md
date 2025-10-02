# Multi-Variant Tour Package Architecture

## Visual Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TOUR PACKAGE QUERY                              │
│                     Kashmir Paradise 7N/8D                              │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                      COMMON ITINERARY                           │  │
│  │  (Shared across all variants)                                   │  │
│  │                                                                  │  │
│  │  Day 1: Srinagar → Shikara Ride, Mughal Gardens                │  │
│  │  Day 2: Srinagar → Local Sightseeing                           │  │
│  │  Day 3: Gulmarg → Gondola, Snow Activities                     │  │
│  │  Day 4: Gulmarg → Apharwat Peak                                │  │
│  │  Day 5: Pahalgam → Betaab Valley                               │  │
│  │  Day 6: Pahalgam → Aru Valley                                  │  │
│  │  Day 7: Srinagar → Shopping                                     │  │
│  │  Day 8: Departure                                               │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────┬──────────────────┬──────────────────────────┐   │
│  │   VARIANT 1      │   VARIANT 2      │   VARIANT 3              │   │
│  │   LUXURY ⭐⭐⭐⭐⭐  │   PREMIUM ⭐⭐⭐⭐   │   STANDARD ⭐⭐⭐ (Default)│   │
│  ├──────────────────┼──────────────────┼──────────────────────────┤   │
│  │ +50% Price       │ +25% Price       │ Base Price               │   │
│  │ ₹52,500/person   │ ₹43,750/person   │ ₹35,000/person           │   │
│  └──────────────────┴──────────────────┴──────────────────────────┘   │
│                                                                         │
│  ┌──────────────────┬──────────────────┬──────────────────────────┐   │
│  │  HOTEL MAPPINGS  │  HOTEL MAPPINGS  │  HOTEL MAPPINGS          │   │
│  ├──────────────────┼──────────────────┼──────────────────────────┤   │
│  │ Day 1-2:         │ Day 1-2:         │ Day 1-2:                 │   │
│  │ LaLiT Palace     │ Vivanta Dal View │ Hotel City Star          │   │
│  │ (5⭐ Palace)      │ (4⭐ Premium)     │ (3⭐ Budget)              │   │
│  │                  │                  │                          │   │
│  │ Day 3-4:         │ Day 3-4:         │ Day 3-4:                 │   │
│  │ Khyber Resort    │ Highlands Park   │ Pine Palace Resort       │   │
│  │ (5⭐ Luxury)      │ (4⭐ Comfort)     │ (3⭐ Standard)            │   │
│  │                  │                  │                          │   │
│  │ Day 5-6:         │ Day 5-6:         │ Day 5-6:                 │   │
│  │ WelcomHotel      │ Hotel Heevan     │ Hotel Paradise           │   │
│  │ (5⭐ Premium)     │ (4⭐ Good)        │ (3⭐ Basic)               │   │
│  └──────────────────┴──────────────────┴──────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Database Relationships

```
┌──────────────────────┐
│  TourPackageQuery    │
│  ─────────────────   │
│  • id (PK)           │
│  • name              │
│  • location          │
│  • pricing           │
└──────────┬───────────┘
           │
           │ 1:N
           ▼
┌──────────────────────┐
│  Itinerary           │
│  ─────────────────   │
│  • id (PK)           │
│  • dayNumber         │
│  • title             │
│  • description       │
│  • activities        │
│  • hotelId (legacy)  │◄──────────┐
└──────────┬───────────┘           │
           │                       │
           │ 1:N                   │
           ▼                       │
┌──────────────────────┐           │
│  PackageVariant      │           │
│  ─────────────────   │           │
│  • id (PK)           │           │
│  • name              │           │
│  • description       │           │
│  • priceModifier     │           │
│  • isDefault         │           │
└──────────┬───────────┘           │
           │                       │
           │ 1:N                   │
           ▼                       │
┌──────────────────────┐           │
│ VariantHotelMapping  │           │
│  ──────────────────  │           │
│  • id (PK)           │           │
│  • variantId (FK)    │           │
│  • itineraryId (FK)  ├───────────┘
│  • hotelId (FK)      │
└──────────┬───────────┘
           │
           │ N:1
           ▼
┌──────────────────────┐
│  Hotel               │
│  ─────────────────   │
│  • id (PK)           │
│  • name              │
│  • location          │
│  • images            │
│  • rating            │
└──────────────────────┘
```

## Data Flow - Creating Multi-Variant Package

```
┌─────────────────┐
│  1. CREATE      │
│  Tour Package   │
│  & Itinerary    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. CREATE      │
│  Variants       │
│  (Luxury,       │
│   Premium,      │
│   Standard)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. ASSIGN      │
│  Hotels to      │
│  Each Variant   │
│  for Each Day   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  4. SAVE        │
│  All Data       │
│  to Database    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  5. CUSTOMER    │
│  Sees 3 Options │
│  & Chooses One  │
└─────────────────┘
```

## Component Structure

```
TourPackageQueryForm
├── GeneralTab
├── LocationTab
├── ItineraryTab (Common for all variants)
│   ├── Day 1 Details
│   ├── Day 2 Details
│   └── ...
├── HotelsTab (Optional - for backward compatibility)
├── PackageVariantsTab ⭐ NEW
│   ├── Variants List
│   │   ├── [Luxury]
│   │   ├── [Premium]
│   │   └── [Standard]
│   │
│   ├── For Selected Variant:
│   │   ├── Variant Settings
│   │   │   ├── Name
│   │   │   ├── Description
│   │   │   ├── Price Modifier
│   │   │   └── Is Default
│   │   │
│   │   └── Hotel Assignments
│   │       ├── Day 1 → [Hotel Selector]
│   │       ├── Day 2 → [Hotel Selector]
│   │       └── ...
│   │
│   └── Actions
│       ├── Add Variant
│       ├── Delete Variant
│       └── Copy Hotels from First Variant
│
├── PricingTab
├── GuestsTab
└── PoliciesTab
```

## API Endpoints Flow

```
Frontend (React)
      │
      │ 1. Load Package
      ▼
GET /api/tourPackageQuery/[id]
      │
      ├─► Returns: { itineraries, packageVariants, ... }
      │
      ▼
Display PackageVariantsTab
      │
      │ 2. User Creates Variant
      ▼
POST /api/package-variants
      │
      ├─► Body: { name, description, priceModifier, ... }
      ├─► Returns: { id, ... }
      │
      │ 3. User Assigns Hotels
      ▼
POST /api/package-variants/[variantId]/hotel-mappings
      │
      ├─► Body: { mappings: [{ itineraryId, hotelId }, ...] }
      ├─► Deletes old mappings
      ├─► Creates new mappings
      │
      │ 4. User Saves Package
      ▼
PATCH /api/tourPackageQuery/[id]
      │
      ├─► Saves all data including variants
      │
      ▼
Database Updated ✓
```

## User Journey - Booking Flow

```
Customer Landing Page
        │
        ▼
Tour Package Details
        │
        ├─► Shows Itinerary (Common)
        │
        ▼
Package Variants Selector
┌──────────────────────────────────────┐
│  Choose Your Experience:             │
│                                      │
│  ○ Luxury      ₹52,500/person       │
│  ● Premium     ₹43,750/person       │ ← Selected
│  ○ Standard    ₹35,000/person       │
└──────────────────────────────────────┘
        │
        ▼
Day-wise Details with Hotels
┌──────────────────────────────────────┐
│ Day 1: Srinagar                      │
│ Hotel: Vivanta Dal View (4⭐)        │
│ [Hotel Images]                       │
│                                      │
│ Day 2: Srinagar                      │
│ Hotel: Vivanta Dal View (4⭐)        │
│ [Hotel Images]                       │
│                                      │
│ Day 3-4: Gulmarg                     │
│ Hotel: Highlands Park (4⭐)          │
│ [Hotel Images]                       │
│ ...                                  │
└──────────────────────────────────────┘
        │
        ▼
[Book Premium Package] Button
        │
        ▼
Booking Confirmation ✓
```

## Comparison View (Optional Feature)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Compare Package Variants                         │
├──────────────────┬──────────────────┬──────────────────────────────┤
│ Feature          │ Luxury           │ Premium        │ Standard    │
├──────────────────┼──────────────────┼────────────────┼─────────────┤
│ Price/Person     │ ₹52,500          │ ₹43,750        │ ₹35,000     │
├──────────────────┼──────────────────┼────────────────┼─────────────┤
│ Hotel Rating     │ 5⭐ Only          │ 4⭐ Only        │ 3⭐ Only     │
├──────────────────┼──────────────────┼────────────────┼─────────────┤
│ Srinagar Hotel   │ LaLiT Palace     │ Vivanta Dal    │ City Star   │
├──────────────────┼──────────────────┼────────────────┼─────────────┤
│ Gulmarg Hotel    │ Khyber Resort    │ Highlands Park │ Pine Palace │
├──────────────────┼──────────────────┼────────────────┼─────────────┤
│ Pahalgam Hotel   │ WelcomHotel      │ Heevan         │ Paradise    │
├──────────────────┼──────────────────┼────────────────┼─────────────┤
│ Amenities        │ Full Spa, Pool   │ Basic Spa      │ Standard    │
├──────────────────┼──────────────────┼────────────────┼─────────────┤
│ Vehicle          │ Luxury SUV       │ Sedan          │ Shared      │
├──────────────────┼──────────────────┼────────────────┼─────────────┤
│                  │ [Select]         │ [Select]       │ [Select]    │
└──────────────────┴──────────────────┴────────────────┴─────────────┘
```

## Key Design Decisions

### ✅ Why This Approach?

1. **Single Source of Truth**: Itinerary is defined once
2. **Flexible Hotels**: Each variant can have completely different hotels
3. **Scalable**: Can add unlimited variants
4. **Maintainable**: Update activities once, applies everywhere
5. **Backward Compatible**: Existing packages still use `itinerary.hotelId`

### 🎯 Benefits Over Alternatives

**Alternative 1**: Duplicate entire packages
- ❌ Data duplication
- ❌ Hard to maintain
- ❌ Inconsistencies

**Alternative 2**: Multiple hotels per day in single variant
- ❌ Confusing pricing
- ❌ No clear differentiation
- ❌ Poor UX

**Our Solution**: Separate variants with mappings
- ✅ Clean separation
- ✅ Easy to understand
- ✅ Simple to manage
- ✅ Great UX

---

This architecture gives you maximum flexibility while maintaining data integrity and ease of use! 🎉
