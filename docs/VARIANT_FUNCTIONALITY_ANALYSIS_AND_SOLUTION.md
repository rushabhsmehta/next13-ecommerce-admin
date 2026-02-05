# 🔍 Tour Package Query Variant Functionality - Deep Analysis & Solution

## 📋 Executive Summary

This document provides a comprehensive analysis of the variant functionality issues in Tour Package Query and proposes a complete solution to integrate missing features from Hotels and Pricing tabs into the Variants tab.

---

## 🚨 Issues Identified

### 1. **Variant Selection Not Persisting After Save**
**Status:** ✅ Backend Ready, ⚠️ Frontend Loading Issue

#### Current State:
- ✅ Database schema has `selectedVariantIds` (Json) and `variantHotelOverrides` (Json) fields
- ✅ POST API (`/api/tourPackageQuery`) saves both fields (line 435)
- ✅ PATCH API (`/api/tourPackageQuery/[id]`) saves both fields (lines 651-652)
- ✅ GET API includes the data in response
- ✅ Form defaultValues initialize from `initialData` (lines 513-514)
- ⚠️ **Problem:** Selection UI may not reflect loaded data properly

#### Root Cause:
```typescript
// In defaultValues (line 513-514):
selectedVariantIds: (initialData as any).selectedVariantIds || [], // ✅ Loads from DB
variantHotelOverrides: (initialData as any).variantHotelOverrides || {}, // ✅ Loads from DB
```

**The form IS loading the data**, but the UI in BasicInfoTab might not be watching the form values correctly during initialization.

#### Evidence:
- File: `src/app/(dashboard)/tourPackageQuery/[tourPackageQueryId]/components/tourPackageQuery-form.tsx`
- Lines 456-514: defaultValues properly map `initialData`
- BasicInfoTab uses `form.watch('selectedVariantIds')` which should work

**Potential Issue:** The form may be resetting or the watch isn't triggering on mount.

---

### 2. **Missing Functionality in QueryVariantsTab**

Currently, `QueryVariantsTab.tsx` (755 lines) only provides:
- ✅ Display of selected variants
- ✅ Hotel override selection per variant per itinerary
- ✅ Basic pricing display from `tourPackagePricings`
- ✅ Visual comparison of variants

**Missing Features** (compared to Hotels + Pricing tabs):
- ❌ **Room Allocation Management** (HotelsTab has this - lines 75-560)
- ❌ **Transport Details Configuration** (HotelsTab has this)
- ❌ **Price Calculation Engine** (PricingTab has 1727 lines of logic)
- ❌ **Pricing Component Selection** (PricingTab functionality)
- ❌ **Manual Price Overrides** (PricingTab functionality)
- ❌ **Meal Plan-based Pricing** (PricingTab functionality)
- ❌ **Vehicle Type Selection** (PricingTab functionality)
- ❌ **Seasonal Period Pricing** (PricingTab functionality)

---

### 3. **Hotels Tab vs Variants Tab Feature Comparison**

#### **HotelsTab.tsx Features** (560 lines):
| Feature | Description | In QueryVariantsTab? |
|---------|-------------|----------------------|
| Hotel Assignment | Select hotel per itinerary day | ✅ Yes |
| Room Allocations | Add multiple rooms with types, occupancy, meal plans | ❌ **NO** |
| Room Type Selection | Dropdown of available room types | ❌ **NO** |
| Occupancy Type | Single, Double, Triple, etc. | ❌ **NO** |
| Meal Plan | EP, CP, MAP, AP selection | ❌ **NO** |
| Custom Room Type | Allow custom room type labels | ❌ **NO** |
| Guest Names | Track guests per room | ❌ **NO** |
| Voucher Numbers | Track booking vouchers | ❌ **NO** |
| Transport Details | Add vehicles per day | ❌ **NO** |
| Vehicle Type | Car, Bus, Tempo Traveller, etc. | ❌ **NO** |
| Transport Quantity | Number of vehicles | ❌ **NO** |
| Copy First Day | Duplicate rooms/transport to all days | ❌ **NO** |
| Batch Operations | Add/remove items easily | ❌ **NO** |

#### **PricingTab.tsx Features** (1727 lines):
| Feature | Description | In QueryVariantsTab? |
|---------|-------------|----------------------|
| Calculation Methods | Manual, Auto Hotel+Transport, Auto Tour Package | ❌ **NO** |
| Pricing Components | Select components from tour package pricing | ❌ **NO** |
| Component Quantities | Set quantity per pricing component | ❌ **NO** |
| Meal Plan Filter | Filter pricing by meal plan | ❌ **NO** |
| Vehicle Type Filter | Filter pricing by vehicle type | ❌ **NO** |
| Seasonal Pricing | Apply seasonal period multipliers | ❌ **NO** |
| Price Breakdown | Show detailed component-level pricing | ❌ **NO** |
| Total Calculation | Auto-calculate total from components | ❌ **NO** |
| Manual Overrides | Enter custom prices per component | ❌ **NO** |
| Price History | Track pricing calculations | ❌ **NO** |
| Export to Form | Update form's totalPrice field | ❌ **NO** |

---

## 🎯 Proposed Solution

### **Phase 1: Fix Variant Selection Persistence (Immediate)**

#### File: `src/components/tour-package-query/BasicInfoTab.tsx`

**Problem:** The variant selection dropdown might not be initializing correctly.

**Solution:**
```tsx
// Add useEffect to ensure initial values are properly set
useEffect(() => {
  const formVariantIds = form.getValues('selectedVariantIds');
  console.log('🔍 BasicInfoTab mounted - selectedVariantIds:', formVariantIds);
  
  // Force trigger watch to ensure UI updates
  if (formVariantIds && formVariantIds.length > 0) {
    form.trigger('selectedVariantIds');
  }
}, [form]);
```

---

### **Phase 2: Extend QueryVariantsTab with Room Allocations**

#### Approach: Variant-Specific Room Allocations

**Current Structure:**
```
itineraries: [
  {
    dayNumber: 1,
    hotelId: "hotel-abc",
    roomAllocations: [
      { roomTypeId: "...", occupancyTypeId: "...", mealPlanId: "...", quantity: 2 }
    ]
  }
]
```

**New Structure for Variants:**
```json
{
  "selectedVariantIds": ["variant-1", "variant-2"],
  "variantHotelOverrides": {
    "variant-1": {
      "itinerary-day-1-id": "hotel-xyz"
    }
  },
  "variantRoomAllocations": {
    "variant-1": {
      "itinerary-day-1-id": [
        {
          "roomTypeId": "...",
          "occupancyTypeId": "...",
          "mealPlanId": "...",
          "quantity": 2,
          "guestNames": "John, Jane",
          "voucherNumber": "V123"
        }
      ]
    },
    "variant-2": {
      "itinerary-day-1-id": [
        {
          "roomTypeId": "...",
          "occupancyTypeId": "...",
          "mealPlanId": "...",
          "quantity": 1
        }
      ]
    }
  }
}
```

#### Implementation Steps:

1. **Update Prisma Schema** (if needed):
```prisma
model TourPackageQuery {
  // ... existing fields
  selectedVariantIds       Json? // Array of variant IDs
  variantHotelOverrides    Json? // { variantId: { itineraryId: hotelId } }
  variantRoomAllocations   Json? // { variantId: { itineraryId: [allocations] } } // NEW
  variantTransportDetails  Json? // { variantId: { itineraryId: [transports] } } // NEW
  variantPricingData       Json? // { variantId: { pricingComponents: [...] } } // NEW
}
```

2. **Update Form Schema** (`tourPackageQuery-form.tsx`):
```typescript
const formSchema = z.object({
  // ... existing fields
  selectedVariantIds: z.array(z.string()).optional(),
  variantHotelOverrides: z.record(z.record(z.string())).optional(),
  variantRoomAllocations: z.record(z.record(z.array(z.any()))).optional(), // NEW
  variantTransportDetails: z.record(z.record(z.array(z.any()))).optional(), // NEW
  variantPricingData: z.record(z.any()).optional(), // NEW
});
```

3. **Enhance QueryVariantsTab Component**:

```tsx
// Add room allocation management per variant
const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

// Watch variant-specific data
const variantRoomAllocations = useWatch({ 
  control, 
  name: "variantRoomAllocations" 
}) as Record<string, Record<string, any[]>> | undefined;

// Helper functions
const addRoomAllocationForVariant = (variantId: string, itineraryId: string) => {
  const current = form.getValues('variantRoomAllocations') || {};
  const variantData = current[variantId] || {};
  const itineraryAllocations = variantData[itineraryId] || [];
  
  form.setValue(`variantRoomAllocations.${variantId}.${itineraryId}`, [
    ...itineraryAllocations,
    { 
      roomTypeId: '', 
      occupancyTypeId: '', 
      mealPlanId: '', 
      quantity: 1,
      guestNames: '',
      voucherNumber: '' 
    }
  ]);
};

// Render room allocations UI per variant
<Tabs value={selectedVariant} onValueChange={setSelectedVariant}>
  {selectedVariants.map(variant => (
    <TabsContent key={variant.id} value={variant.id}>
      {itineraries.map(itinerary => (
        <Card key={itinerary.id}>
          <CardHeader>
            <CardTitle>Day {itinerary.dayNumber} - Hotel Rooms</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Room allocations for this variant + itinerary */}
            <Button onClick={() => addRoomAllocationForVariant(variant.id, itinerary.id)}>
              Add Room
            </Button>
          </CardContent>
        </Card>
      ))}
    </TabsContent>
  ))}
</Tabs>
```

---

### **Phase 3: Integrate Pricing Calculation Engine**

#### Option A: Reuse PricingTab Logic
**Pros:**
- Faster implementation
- Proven logic
- Consistent calculations

**Cons:**
- Code duplication
- Hard to maintain

#### Option B: Extract Shared Pricing Service (RECOMMENDED)
**Pros:**
- Single source of truth
- Reusable across tabs
- Easier to maintain
- Better testing

**Implementation:**

1. **Create `src/lib/pricing-calculator.ts`:**
```typescript
export interface PricingOptions {
  mealPlanId?: string;
  vehicleTypeId?: string;
  numberOfRooms: number;
  numberOfNights: number;
  seasonalPeriodId?: string;
}

export interface PricingResult {
  components: Array<{
    id: string;
    name: string;
    unitPrice: number;
    quantity: number;
    total: number;
  }>;
  subtotal: number;
  taxes: number;
  total: number;
}

export async function calculateVariantPricing(
  variantId: string,
  options: PricingOptions
): Promise<PricingResult> {
  // Fetch pricing from API
  const response = await axios.post('/api/pricing/calculate', {
    variantId,
    ...options
  });
  
  return response.data;
}
```

2. **Create API Endpoint `/api/pricing/calculate/route.ts`:**
```typescript
export async function POST(req: Request) {
  const { variantId, mealPlanId, vehicleTypeId, numberOfRooms, numberOfNights } = await req.json();
  
  // Fetch tour package pricing for variant
  const pricing = await prismadb.tourPackagePricing.findFirst({
    where: {
      variantId,
      mealPlanId,
      vehicleTypeId,
    },
    include: {
      pricingComponents: {
        include: {
          pricingAttribute: true
        }
      }
    }
  });
  
  // Calculate totals
  const components = pricing.pricingComponents.map(comp => ({
    id: comp.id,
    name: comp.name,
    unitPrice: comp.pricePerNight,
    quantity: comp.pricingAttribute?.calculationMethod === 'per-night' 
      ? numberOfNights 
      : numberOfRooms,
    total: calculateComponentTotal(comp, numberOfRooms, numberOfNights)
  }));
  
  const subtotal = components.reduce((sum, c) => sum + c.total, 0);
  
  return NextResponse.json({
    components,
    subtotal,
    taxes: 0,
    total: subtotal
  });
}
```

3. **Use in QueryVariantsTab:**
```tsx
const [variantPricing, setVariantPricing] = useState<Record<string, PricingResult>>({});

const calculatePricingForVariant = async (variantId: string) => {
  try {
    const result = await calculateVariantPricing(variantId, {
      numberOfRooms: 1,
      numberOfNights: itineraries.length - 1,
      mealPlanId: form.getValues('selectedMealPlanId'),
    });
    
    setVariantPricing(prev => ({
      ...prev,
      [variantId]: result
    }));
    
    toast.success(`Calculated pricing for ${variant.name}`);
  } catch (error) {
    toast.error('Failed to calculate pricing');
  }
};
```

---

### **Phase 4: UI/UX Improvements**

#### Design Enhancements for QueryVariantsTab:

1. **Tabbed Interface per Variant:**
```
┌─────────────────────────────────────────────┐
│  [Luxury] [Premium] [Standard] ← Variant Tabs
├─────────────────────────────────────────────┤
│  📌 Luxury Package Details                  │
│  ┌────────────────────────────────────────┐ │
│  │ 🏨 Hotels  │ 🛏️ Rooms │ 💰 Pricing     │ │ ← Sub-tabs
│  └────────────────────────────────────────┘ │
│                                              │
│  Day 1: Delhi                                │
│  ├─ Hotel: Taj Palace                        │
│  ├─ Rooms:                                   │
│  │  • Deluxe Room x2 (Double, MAP)          │
│  │  • Suite x1 (Triple, AP)                 │
│  ├─ Transport: Sedan x1                      │
│  └─ Price: ₹25,000                           │
│                                              │
│  [Calculate Total Price]                     │
│  Total: ₹2,50,000                            │
└─────────────────────────────────────────────┘
```

2. **Comparison View:**
```
┌───────────────────────────────────────────────────────┐
│  Compare Variants Side-by-Side                        │
├──────────────┬──────────────┬─────────────────────────┤
│   Luxury     │   Premium    │    Standard            │
├──────────────┼──────────────┼─────────────────────────┤
│ 5★ Hotels    │ 4★ Hotels    │ 3★ Hotels              │
│ ₹3,00,000    │ ₹2,00,000    │ ₹1,50,000              │
│ AP Meals     │ MAP Meals    │ CP Meals               │
│ Sedan        │ SUV          │ Bus                    │
└──────────────┴──────────────┴─────────────────────────┘
```

---

## 🛠️ Implementation Checklist

### **Immediate (Week 1)**
- [ ] Fix variant selection persistence issue in BasicInfoTab
- [ ] Add console logging to debug form value loading
- [ ] Test save/load cycle thoroughly
- [ ] Add visual feedback when variants are selected

### **Short Term (Week 2-3)**
- [ ] Add `variantRoomAllocations` field to schema
- [ ] Add `variantTransportDetails` field to schema
- [ ] Run Prisma migration
- [ ] Update API endpoints to save/load new fields
- [ ] Extend QueryVariantsTab with room allocation UI

### **Medium Term (Week 4-5)**
- [ ] Extract pricing logic to shared service
- [ ] Create `/api/pricing/calculate` endpoint
- [ ] Integrate pricing calculator in QueryVariantsTab
- [ ] Add pricing component selection UI
- [ ] Test pricing calculations thoroughly

### **Long Term (Week 6-8)**
- [ ] Add comparison view for variants
- [ ] Implement batch operations (copy from first day)
- [ ] Add export/import variant configurations
- [ ] Performance optimization for large queries
- [ ] Documentation and user guides

---

## 📊 Impact Assessment

### **Benefits:**
1. ✅ **Complete Feature Parity** - Variants tab will have all functionality of Hotels + Pricing tabs
2. ✅ **Better UX** - Users can configure everything in one place
3. ✅ **Data Consistency** - Variant-specific configurations properly tracked
4. ✅ **Scalability** - Structure supports unlimited variants
5. ✅ **Maintainability** - Shared pricing service reduces duplication

### **Risks:**
1. ⚠️ **Database Schema Changes** - Requires careful migration
2. ⚠️ **Backward Compatibility** - Old queries without variant data must still work
3. ⚠️ **Performance** - Complex variant configurations may slow down form
4. ⚠️ **Testing Complexity** - Many permutations to test

### **Mitigation:**
- Use optional fields (Json?) to maintain backward compatibility
- Implement progressive enhancement (features work with or without variant data)
- Add loading states and optimize API calls
- Create comprehensive test scenarios

---

## 🔗 Related Files

### **Core Files to Modify:**
1. `src/components/tour-package-query/BasicInfoTab.tsx` (Line 70-280)
2. `src/components/tour-package-query/QueryVariantsTab.tsx` (All 755 lines)
3. `src/app/(dashboard)/tourPackageQuery/[tourPackageQueryId]/components/tourPackageQuery-form.tsx` (Lines 200-560)
4. `src/app/api/tourPackageQuery/route.ts` (Lines 200-600)
5. `src/app/api/tourPackageQuery/[tourPackageQueryId]/route.ts` (Lines 400-700)
6. `schema.prisma` (Lines 208-280 - TourPackageQuery model)

### **Files to Create:**
1. `src/lib/pricing-calculator.ts` (New service)
2. `src/app/api/pricing/calculate/route.ts` (New endpoint)
3. `src/components/tour-package-query/VariantRoomAllocations.tsx` (New component)
4. `src/components/tour-package-query/VariantPricingPanel.tsx` (New component)

---

## 📚 References

- [Variant Comparison Guide](./archive/VARIANTS_COMPARISON_GUIDE.md)
- [Package Variants String to Array Fix](./archive/PACKAGE_VARIANTS_STRING_TO_ARRAY_FIX.md)
- [Tour Package Query PDF View Feature](../TOUR_PACKAGE_QUERY_PDF_VIEW_FEATURE.md)
- [Variant Enhancement Summary](../VARIANT_ENHANCEMENT_SUMMARY.md)

---

## 🎯 Next Steps

1. **Review this document** with the team
2. **Prioritize phases** based on business needs
3. **Create detailed task breakdown** for Phase 1
4. **Set up testing environment** for variant functionality
5. **Begin implementation** starting with variant persistence fix

---

*Document Created: 2026-02-05*  
*Status: Draft for Review*  
*Author: AI Development Assistant*
