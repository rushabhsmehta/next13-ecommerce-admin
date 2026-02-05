# 💰 Variant Pricing API - Quick Reference

**Version:** 1.0  
**Last Updated:** February 5, 2026

---

## 📡 API Endpoints

### 1. Calculate Variant Pricing

**Endpoint:** `POST /api/pricing/calculate-variant`  
**Purpose:** Calculate pricing for a specific tour package variant  
**Auth:** Required (via Clerk middleware)

#### Request

```typescript
POST /api/pricing/calculate-variant
Content-Type: application/json

{
  "variantId": string,              // Required: Variant UUID
  "variantRoomAllocations": object, // Required: Room allocations JSON
  "variantTransportDetails": object,// Required: Transport details JSON
  "itineraries": array,             // Required: Itinerary array
  "tourStartsFrom": string,         // Required: ISO date string
  "tourEndsOn": string,             // Required: ISO date string
  "markup": number                  // Optional: Markup % (default: 0)
}
```

**Example Request:**
```json
{
  "variantId": "clx1234567890abcdefghijk",
  "variantRoomAllocations": {
    "clx1234567890abcdefghijk": {
      "itinerary-1": [
        {
          "roomTypeId": "room-type-uuid",
          "occupancyTypeId": "occupancy-uuid",
          "mealPlanId": "meal-plan-uuid",
          "quantity": 2,
          "guestNames": "John Doe, Jane Doe",
          "voucherNumber": "V12345"
        }
      ],
      "itinerary-2": [...]
    }
  },
  "variantTransportDetails": {
    "clx1234567890abcdefghijk": {
      "itinerary-1": [
        {
          "vehicleTypeId": "vehicle-type-uuid",
          "quantity": 1,
          "description": "Airport transfer"
        }
      ]
    }
  },
  "itineraries": [
    {
      "id": "itinerary-1",
      "locationId": "location-uuid",
      "dayNumber": 1,
      "hotelId": "hotel-uuid"
    },
    {
      "id": "itinerary-2",
      "locationId": "location-uuid",
      "dayNumber": 2,
      "hotelId": "hotel-uuid"
    }
  ],
  "tourStartsFrom": "2026-03-15T00:00:00.000Z",
  "tourEndsOn": "2026-03-20T00:00:00.000Z",
  "markup": 10
}
```

#### Response (Success: 200)

```typescript
{
  totalCost: number,              // Final cost with markup
  basePrice: number,              // Cost before markup
  appliedMarkup: {
    percentage: number,           // Markup percentage applied
    amount: number                // Markup amount in currency
  },
  breakdown: {
    accommodation: number,        // Total accommodation cost
    transport: number             // Total transport cost
  },
  itineraryBreakdown: [
    {
      day: number,                // Day number
      accommodationCost: number,  // Accommodation cost for this day
      transportCost: number,      // Transport cost for this day
      totalCost: number,          // Total cost for this day
      roomBreakdown: [
        {
          roomTypeId: string,
          occupancyTypeId: string,
          mealPlanId: string,
          quantity: number,
          pricePerNight: number,  // Price per room per night
          totalCost: number,      // Total for this room allocation
          roomTypeName: string,   // Human-readable room type
          occupancyTypeName: string,
          mealPlanName: string
        }
      ]
    }
  ],
  transportDetails: [
    {
      day: number,
      vehicleTypeId: string,
      vehicleType: string,        // Human-readable vehicle type
      quantity: number,
      pricePerUnit: number,
      pricingType: string,        // "PerDay", "PerTrip", etc.
      totalCost: number
    }
  ],
  calculatedAt: string            // ISO timestamp
}
```

**Example Response:**
```json
{
  "totalCost": 55000,
  "basePrice": 50000,
  "appliedMarkup": {
    "percentage": 10,
    "amount": 5000
  },
  "breakdown": {
    "accommodation": 40000,
    "transport": 10000
  },
  "itineraryBreakdown": [
    {
      "day": 1,
      "accommodationCost": 8000,
      "transportCost": 2000,
      "totalCost": 10000,
      "roomBreakdown": [
        {
          "roomTypeId": "clxroom123",
          "occupancyTypeId": "clxocc456",
          "mealPlanId": "clxmeal789",
          "quantity": 2,
          "pricePerNight": 4000,
          "totalCost": 8000,
          "roomTypeName": "Deluxe Room",
          "occupancyTypeName": "Double Occupancy",
          "mealPlanName": "MAP (Breakfast + Dinner)"
        }
      ]
    },
    {
      "day": 2,
      "accommodationCost": 8000,
      "transportCost": 0,
      "totalCost": 8000,
      "roomBreakdown": [...]
    }
  ],
  "transportDetails": [
    {
      "day": 1,
      "vehicleTypeId": "clxvehicle123",
      "vehicleType": "Sedan",
      "quantity": 1,
      "pricePerUnit": 2000,
      "pricingType": "PerDay",
      "totalCost": 2000
    }
  ],
  "calculatedAt": "2026-02-05T10:30:00.000Z"
}
```

#### Response (Error: 400)

**Missing variantId:**
```json
"Missing variantId"
```

**Missing dates:**
```json
"Missing tour start or end date"
```

**Missing/invalid itineraries:**
```json
"Missing or invalid itineraries"
```

#### Response (Error: 500)

```json
{
  "error": "Internal server error",
  "message": "Specific error message",
  "details": "Stack trace (only in development)"
}
```

---

### 2. Calculate Standard Pricing (Non-Variant)

**Endpoint:** `POST /api/pricing/calculate`  
**Purpose:** Calculate pricing for standard tour package query (not variant-specific)  
**Auth:** Required

#### Request

```typescript
POST /api/pricing/calculate
Content-Type: application/json

{
  "tourStartsFrom": string,       // Required: ISO date
  "tourEndsOn": string,           // Required: ISO date
  "itineraries": array,           // Required: Itineraries with rooms/transport
  "markup": number                // Optional: Markup % (default: 0)
}
```

**Example Request:**
```json
{
  "tourStartsFrom": "2026-03-15T00:00:00.000Z",
  "tourEndsOn": "2026-03-20T00:00:00.000Z",
  "itineraries": [
    {
      "locationId": "location-uuid",
      "dayNumber": 1,
      "hotelId": "hotel-uuid",
      "roomAllocations": [
        {
          "roomTypeId": "room-type-uuid",
          "occupancyTypeId": "occupancy-uuid",
          "mealPlanId": "meal-plan-uuid",
          "quantity": 2
        }
      ],
      "transportDetails": [
        {
          "vehicleTypeId": "vehicle-type-uuid",
          "quantity": 1
        }
      ]
    }
  ],
  "markup": 10
}
```

#### Response

Same structure as variant pricing endpoint.

---

## 🔧 Shared Service: `pricing-calculator.ts`

### Main Functions

#### `calculatePricing(options)`

**Purpose:** Calculate pricing for any itinerary configuration  
**Use Case:** Both variant and non-variant pricing

```typescript
import { calculatePricing } from '@/lib/pricing-calculator';

const result = await calculatePricing({
  tourStartsFrom: new Date('2026-03-15'),
  tourEndsOn: new Date('2026-03-20'),
  itineraries: [
    {
      locationId: 'loc-uuid',
      dayNumber: 1,
      hotelId: 'hotel-uuid',
      roomAllocations: [...],
      transportDetails: [...]
    }
  ],
  markup: 10,
  includeNames: true  // Include room/occupancy/meal plan names
});

console.log(result.totalCost);        // 55000
console.log(result.basePrice);        // 50000
console.log(result.breakdown);        // { accommodation: 40000, transport: 10000 }
```

#### `calculateVariantPricing(params)`

**Purpose:** Calculate pricing for a specific variant  
**Use Case:** Variant-specific pricing with JSON data structures

```typescript
import { calculateVariantPricing } from '@/lib/pricing-calculator';

const result = await calculateVariantPricing({
  variantId: 'variant-uuid',
  variantRoomAllocations: {
    'variant-uuid': {
      'itinerary-1': [{ roomTypeId: '...', ... }]
    }
  },
  variantTransportDetails: {
    'variant-uuid': {
      'itinerary-1': [{ vehicleTypeId: '...', ... }]
    }
  },
  itineraries: [...],  // Full itinerary objects
  tourStartsFrom: new Date('2026-03-15'),
  tourEndsOn: new Date('2026-03-20'),
  markup: 10
});
```

#### `formatCurrency(amount)`

**Purpose:** Format number as Indian Rupees (no decimals)

```typescript
import { formatCurrency } from '@/lib/pricing-calculator';

formatCurrency(55000);  // "₹55,000"
formatCurrency(1234.56);  // "₹1,235"
```

#### `formatCurrencyDetailed(amount)`

**Purpose:** Format number as Indian Rupees (with decimals)

```typescript
import { formatCurrencyDetailed } from '@/lib/pricing-calculator';

formatCurrencyDetailed(55000);  // "₹55,000.00"
formatCurrencyDetailed(1234.56);  // "₹1,234.56"
```

---

## 📊 Data Structures

### Room Allocation (Input)

```typescript
interface RoomAllocation {
  roomTypeId: string;        // Required: Room type UUID
  occupancyTypeId: string;   // Required: Occupancy type UUID
  mealPlanId: string;        // Required: Meal plan UUID
  quantity: number;          // Required: Number of rooms
  guestNames?: string;       // Optional: Comma-separated names
  voucherNumber?: string;    // Optional: Booking reference
}
```

### Transport Detail (Input)

```typescript
interface TransportDetail {
  vehicleTypeId: string;     // Required: Vehicle type UUID
  quantity: number;          // Required: Number of vehicles
  description?: string;      // Optional: Additional notes
}
```

### Pricing Itinerary (Input)

```typescript
interface PricingItinerary {
  locationId: string;        // Required: Location UUID
  dayNumber: number;         // Required: Day number (1, 2, 3, ...)
  hotelId?: string;          // Optional: Hotel UUID (if accommodation needed)
  roomAllocations: RoomAllocation[];
  transportDetails: TransportDetail[];
}
```

### Room Cost Detail (Output)

```typescript
interface RoomCostDetail {
  roomTypeId: string;
  occupancyTypeId: string;
  mealPlanId: string;
  quantity: number;
  pricePerNight: number;     // Price per room per night
  totalCost: number;         // Total for this allocation
  roomTypeName?: string;     // Included if includeNames=true
  occupancyTypeName?: string;
  mealPlanName?: string;
}
```

### Transport Cost Detail (Output)

```typescript
interface TransportCostDetail {
  day: number;
  vehicleTypeId: string;
  vehicleType: string;       // Always included
  quantity: number;
  pricePerUnit: number;
  pricingType: string;       // "PerDay", "PerTrip", etc.
  totalCost: number;
}
```

### Day Pricing Result (Output)

```typescript
interface DayPricingResult {
  day: number;
  accommodationCost: number;
  transportCost: number;
  totalCost: number;
  roomBreakdown: RoomCostDetail[];
  hotelName?: string;        // Reserved for future use
}
```

### Pricing Calculation Result (Output)

```typescript
interface PricingCalculationResult {
  totalCost: number;
  basePrice: number;
  appliedMarkup: {
    percentage: number;
    amount: number;
  };
  breakdown: {
    accommodation: number;
    transport: number;
  };
  itineraryBreakdown: DayPricingResult[];
  transportDetails: TransportCostDetail[];
  calculatedAt: Date;
}
```

---

## 🗄️ Database Queries

### Hotel Pricing Lookup

```typescript
await prismadb.hotelPricing.findFirst({
  where: {
    hotelId: string,
    roomTypeId: string,
    occupancyTypeId: string,
    mealPlanId: string,
    isActive: true,
    startDate: { lte: tourEndsOn },
    endDate: { gte: tourStartsFrom }
  },
  orderBy: {
    startDate: 'desc'
  }
});
```

**Logic:**
- Finds pricing that overlaps with tour dates
- Filters to active pricing only
- Returns most recent pricing first

### Transport Pricing Lookup

```typescript
await prismadb.transportPricing.findFirst({
  where: {
    locationId: string,
    vehicleTypeId: string,
    isActive: true,
    startDate: { lte: tourEndsOn },
    endDate: { gte: tourStartsFrom }
  },
  include: {
    vehicleType: true
  },
  orderBy: {
    startDate: 'desc'
  }
});
```

**Logic:**
- Finds pricing that overlaps with tour dates
- Filters to active pricing only
- Includes vehicle type for name display
- Returns most recent pricing first

### Lookup Tables (Optional)

```typescript
// Only if includeNames=true
const [roomTypes, occupancyTypes, mealPlans] = await Promise.all([
  prismadb.roomType.findMany({ where: { isActive: true } }),
  prismadb.occupancyType.findMany({ where: { isActive: true } }),
  prismadb.mealPlan.findMany({ where: { isActive: true } })
]);
```

---

## 🧮 Calculation Formulas

### Room Cost per Day

```
roomCost = pricePerNight × quantity
```

Where:
- `pricePerNight` = from `hotelPricing.price`
- `quantity` = from `roomAllocation.quantity`

### Transport Cost per Day

```
transportCost = pricePerUnit × quantity
```

Where:
- `pricePerUnit` = from `transportPricing.price`
- `quantity` = from `transportDetail.quantity`

**Note:** Calculation is same for both "PerDay" and "PerTrip" pricing types currently.

### Total Accommodation Cost

```
totalAccommodation = Σ(roomCost for all days)
```

### Total Transport Cost

```
totalTransport = Σ(transportCost for all days)
```

### Base Price

```
basePrice = totalAccommodation + totalTransport
```

### Markup Amount

```
markupAmount = basePrice × (markupPercentage / 100)
```

### Final Total Cost

```
totalCost = basePrice + markupAmount
```

**Rounding:** Final total is rounded to nearest integer.

---

## 🔐 Security & Validation

### Request Validation

1. **variantId:** Must be non-empty string
2. **tourStartsFrom/tourEndsOn:** Must be valid date strings
3. **itineraries:** Must be non-empty array
4. **markup:** Must be number (default: 0 if not provided)

### Data Validation

1. **Room quantity:** Must be > 0 to be included in calculation
2. **Transport quantity:** Default to 1 if not provided
3. **Pricing records:** Must be `isActive: true`
4. **Date overlap:** Pricing must overlap with tour dates

### Error Handling

- Missing required fields → 400 Bad Request
- Database errors → 500 Internal Server Error
- Calculation errors → Logged to console, returns 500

---

## 🎯 Use Cases

### Use Case 1: Frontend Pricing Calculator

```typescript
// In QueryVariantsTab.tsx
const calculateVariantPricing = async (variantId: string) => {
  const response = await axios.post('/api/pricing/calculate-variant', {
    variantId,
    variantRoomAllocations: form.getValues('variantRoomAllocations'),
    variantTransportDetails: form.getValues('variantTransportDetails'),
    itineraries: form.getValues('itineraries'),
    tourStartsFrom: form.getValues('tourStartsFrom'),
    tourEndsOn: form.getValues('tourEndsOn'),
    markup: markupValues[variantId] || 0
  });
  
  setPricingResults({ ...pricingResults, [variantId]: response.data });
};
```

### Use Case 2: Backend Batch Calculation

```typescript
// In a background job
import { calculateVariantPricing } from '@/lib/pricing-calculator';

const queries = await prismadb.tourPackageQuery.findMany({
  where: { selectedVariantIds: { not: null } }
});

for (const query of queries) {
  for (const variantId of query.selectedVariantIds) {
    const pricing = await calculateVariantPricing({
      variantId,
      variantRoomAllocations: query.variantRoomAllocations,
      variantTransportDetails: query.variantTransportDetails,
      itineraries: query.itineraries,
      tourStartsFrom: query.tourStartsFrom,
      tourEndsOn: query.tourEndsOn,
      markup: 10
    });
    
    // Save pricing to database
    await prismadb.tourPackageQuery.update({
      where: { id: query.id },
      data: {
        variantPricingData: {
          ...query.variantPricingData,
          [variantId]: pricing
        }
      }
    });
  }
}
```

### Use Case 3: Testing Pricing Service

```typescript
// In a test script
import { calculatePricing } from '@/lib/pricing-calculator';

const testResult = await calculatePricing({
  tourStartsFrom: new Date('2026-03-15'),
  tourEndsOn: new Date('2026-03-20'),
  itineraries: [
    {
      locationId: 'test-location',
      dayNumber: 1,
      hotelId: 'test-hotel',
      roomAllocations: [
        {
          roomTypeId: 'test-room-type',
          occupancyTypeId: 'test-occupancy',
          mealPlanId: 'test-meal-plan',
          quantity: 2
        }
      ],
      transportDetails: []
    }
  ],
  markup: 0,
  includeNames: false
});

console.assert(testResult.totalCost > 0, 'Total cost should be positive');
console.assert(testResult.breakdown.accommodation > 0, 'Accommodation cost should exist');
```

---

## 📝 Changelog

### Version 1.0 (February 5, 2026)
- ✅ Initial release
- ✅ Variant pricing calculation endpoint
- ✅ Standard pricing calculation endpoint (refactored)
- ✅ Shared pricing calculator service
- ✅ Hotel and transport pricing lookups
- ✅ Markup calculation
- ✅ Day-by-day breakdown
- ✅ Room type/occupancy/meal plan name resolution

---

## 🆘 Troubleshooting

### Issue: "No pricing found" (Total = ₹0)

**Possible Causes:**
1. No `hotelPricing` records exist for the hotel/room/occupancy/meal plan combination
2. Tour dates don't overlap with pricing date ranges
3. Pricing records are `isActive: false`

**Solution:**
- Check `hotelPricing` table for matching records
- Verify tour dates are within pricing date ranges
- Ensure pricing records are active

### Issue: "Calculation takes too long"

**Possible Causes:**
1. Too many room allocations/transport details
2. Database performance issues

**Solution:**
- Optimize database indexes on `hotelPricing` and `transportPricing` tables
- Consider batching queries or caching

### Issue: "Markup not applied"

**Possible Causes:**
1. Markup value is 0 or not provided
2. JavaScript type coercion issues

**Solution:**
- Verify markup value is a number (not string "0")
- Check `appliedMarkup` in response to confirm percentage

---

**📚 For full implementation details, see:** [PHASE_3_VARIANT_PRICING_CALCULATOR_COMPLETE.md](./PHASE_3_VARIANT_PRICING_CALCULATOR_COMPLETE.md)
