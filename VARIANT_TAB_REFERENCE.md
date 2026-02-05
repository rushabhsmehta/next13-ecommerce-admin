# Tour Package Query - Variants Tab Quick Reference

## Overview
The enhanced Variants Tab now provides comprehensive information about selected package variants, including hotel mappings, room allocations, and detailed pricing calculations.

## Visual Structure

```
┌─────────────────────────────────────────────────────────────┐
│ 🌟 SELECTED PACKAGE VARIANTS                                │
│    Variants from: "Kashmir Paradise Tour"                   │
│    Total: 3  [Has Default]                                  │
└─────────────────────────────────────────────────────────────┘

┌───────┬───────────┬────────────┐
│   🌟  │    🌟     │     🌟     │
│Luxury │  Premium  │  Standard  │
│       │  [Default]│            │
└───────┴───────────┴────────────┘

When "Luxury" variant selected:
┌─────────────────────────────────────────────────────────────┐
│ 🌟 Variant Details                                           │
│                                                               │
│ Variant Name: Luxury                                         │
│ Price Modifier: +15%                                         │
│ Description: Premium accommodations with exclusive perks     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🏨 Hotel Mappings (7)                                        │
│                                                               │
│ ▼ Day 1 🏨 Hotel Taj                           [Modified]    │
│   ┌───────────────────────────────────────────────────────┐ │
│   │ 🖼️ [Hotel Images Grid - 4 images]                    │ │
│   │                                                         │ │
│   │ 📍 Hotel Details                                       │ │
│   │    City: Srinagar                                      │ │
│   │    Rating: 5 Star                                      │ │
│   │                                                         │ │
│   │ 📅 Itinerary Info                                      │ │
│   │    Arrival in Kashmir - Welcome to Paradise            │ │
│   │    Transfer to hotel, evening Dal Lake visit           │ │
│   │                                                         │ │
│   │ 🛏️ Room Allocations (3)                              │ │ ◄── NEW!
│   │    👥 [Deluxe Room] [Double] [🍴 MAP] ×2             │ │
│   │       Guests: John Doe, Jane Doe                       │ │
│   │       Voucher: V123456                                 │ │
│   │    👥 [Suite] [Triple] [🍴 AP] ×1                    │ │
│   │       Guests: Family Group A                           │ │
│   │    👥 [Standard] [Single] [🍴 CP] ×1                 │ │
│   │                                                         │ │
│   │ [✏️ Change Hotel]                                      │ │
│   └───────────────────────────────────────────────────────┘ │
│                                                               │
│ ▼ Day 2 🏨 Houseboat Deluxe                                 │
│   ... (similar structure)                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 💰 Pricing Details (4)                                       │
│                                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 1️⃣  📅 15 Dec 2024 - 31 Dec 2024  [Peak Season]      │   │
│ │                                                        │   │
│ │ 🍴 MAP  🏨 2 Rooms  🚗 Innova  [Group Pricing]        │   │
│ │                                                        │   │
│ │ 🧾 Price Breakdown                                    │   │
│ │    Per Person (Adult)               ₹25,000           │   │
│ │    Per Person (Child 5-12)          ₹15,000           │   │
│ │    Hotel Charges                    ₹30,000           │   │
│ │    Transport Charges                ₹12,000           │   │
│ │    Guide Charges                     ₹5,000           │   │
│ │    ───────────────────────────────────────           │   │
│ │    Total                            ₹87,000           │   │
│ │                                                        │   │
│ │ ℹ️  Prices inclusive of all taxes                    │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 2️⃣  📅 01 Jan 2025 - 15 Jan 2025  [Off Season]       │   │
│ │    ... (similar structure)                            │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🧮 Price Calculation Summary                          ◄── NEW!│
│                                                               │
│ ┌──────────────┬──────────────┬──────────────────────────┐ │
│ │   Pricing    │  Avg. Price  │      Grand Total         │ │
│ │   Periods    │  per Period  │                          │ │
│ │              │              │                          │ │
│ │      4       │  ₹78,500     │       ₹3,14,000         │ │
│ └──────────────┴──────────────┴──────────────────────────┘ │
│                                                               │
│ 📅 Pricing Date Range                                        │
│    15 Dec 2024 - 31 Mar 2025                                 │
│                                                               │
│ ⚠️  This variant has a +15% price modifier applied           │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Variant Selection Display
- Shows which variants are selected from the tour package
- Indicates default variant with badge
- Tab-based navigation between variants

### 2. Hotel Mappings with Room Allocations (NEW!)
- Each day's hotel is displayed with details
- **Room allocations now visible** including:
  - Room type and occupancy
  - Meal plan 
  - Number of rooms
  - Guest names
  - Voucher numbers
- Ability to change hotels per variant
- Visual indicators for modified hotels

### 3. Detailed Pricing Information
- Multiple pricing periods with date ranges
- Meal plan, room count, vehicle type per period
- Complete price breakdown with components
- Seasonal period badges
- Period descriptions and notes

### 4. Price Calculation Summary (NEW!)
- **Total pricing periods**: Count of all defined periods
- **Average price per period**: Quick comparison metric
- **Grand total**: Sum across all periods
- **Date range**: Overall pricing coverage
- **Price modifier alerts**: Highlights variant-specific adjustments

## Data Sources

| Section | Data Source | Notes |
|---------|-------------|-------|
| Variant Details | PackageVariant from TourPackage | Basic variant info |
| Hotel Mappings | VariantHotelMapping | Which hotel for which day |
| Hotel Images | Hotel.images | From hotel master data |
| Itinerary Info | Itinerary from TourPackage | Day titles and descriptions |
| **Room Allocations** | **Query.itineraries[].roomAllocations** | **Matched by dayNumber** |
| Pricing Details | TourPackagePricing | From selected variant |
| Price Components | PricingComponent | Breakdown by attribute |
| **Price Summary** | **Calculated from all pricings** | **Aggregated totals** |

## User Interactions

### Viewing
- Click variant tab to switch between variants
- Expand/collapse hotel accordions
- Scroll through pricing periods
- View room allocation details

### Editing
- Click "Change Hotel" to select different hotel for a day
- Changes are saved to `variantHotelOverrides`
- Modified hotels show badge
- All changes persist on save

### Understanding Pricing
- See breakdown by component (per person, per room, etc.)
- Understand seasonal variations
- Compare totals across periods
- Factor in variant modifiers

## Technical Implementation

### Component Props
```typescript
interface QueryVariantsTabProps {
  control: Control<any>;
  form: any;
  loading?: boolean;
  tourPackages: TourPackageWithVariants[];
  hotels: (Hotel & { images: Images[] })[];
  roomTypes?: RoomType[];        // NEW
  occupancyTypes?: OccupancyType[]; // NEW
  mealPlans?: MealPlan[];        // NEW
  vehicleTypes?: VehicleType[];  // NEW
}
```

### Data Flow
```
1. User selects tour package & variants in Basic Info tab
   ↓
2. Form stores: selectedVariantIds, variantHotelOverrides
   ↓
3. On save, API persists these fields + creates variant snapshots
   ↓
4. On load, form restores these fields from database
   ↓
5. Variants tab displays:
   - Variant details from selected tour package
   - Hotel mappings from variant
   - Room allocations from query itineraries (matched by day)
   - Pricing from variant pricing snapshots
   - Calculated summaries from all data
```

## Persistence

After save, the following are stored:

**In TourPackageQuery table**:
- `selectedVariantIds`: `["variant-id-1", "variant-id-2"]`
- `variantHotelOverrides`: `{ "variant-id-1": { "itinerary-id": "hotel-id" } }`

**In separate tables**:
- `QueryVariantSnapshot`: One record per selected variant
- `QueryVariantHotelSnapshot`: Hotels for each variant
- `QueryVariantPricingSnapshot`: Pricing periods for each variant
- `QueryVariantPricingComponentSnapshot`: Price breakdown

**In Query's itineraries**:
- `RoomAllocation`: Room details per day (displayed in variants tab)

## Benefits of New Features

### Room Allocations in Variants Tab
✅ See complete accommodation details alongside hotel info
✅ Understand room distribution across days
✅ Verify guest assignments and voucher numbers
✅ No need to switch between Hotels and Variants tabs

### Price Calculation Summary  
✅ Quick overview of total costs
✅ Understand pricing structure at a glance
✅ Compare average vs total pricing
✅ See date coverage for pricing
✅ Identify variant-specific adjustments

## Migration Notes

Before these changes:
- Variants tab showed hotels and basic pricing
- Room details only in Hotels tab
- No pricing summary or totals
- Selections lost after save

After these changes:
- Variants tab shows complete information
- Room allocations integrated
- Comprehensive pricing analysis
- Selections persist correctly

## Next Steps for Users

1. **Test the persistence**: 
   - Select tour package and variants
   - Save the query
   - Reopen and verify selections are retained

2. **Review room allocations**:
   - Go to Hotels tab and configure rooms
   - Switch to Variants tab
   - Verify rooms appear for each variant/day

3. **Analyze pricing**:
   - Review pricing details for each period
   - Check the summary calculations
   - Verify price modifiers are applied

4. **Customize hotels**:
   - Change a hotel for a specific variant
   - Save and verify override persists
   - Check "Modified" badge appears

## Support

For issues or questions:
- Check `VARIANT_ENHANCEMENT_SUMMARY.md` for technical details
- Run test script: `node scripts/tests/test-variant-persistence.js`
- Review database schema in `schema.prisma`
- Contact development team for assistance
