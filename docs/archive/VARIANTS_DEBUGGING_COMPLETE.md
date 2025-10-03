# 🔍 Package Variants Debugging & Data Transformation Fix

## 🎯 Issues Being Diagnosed

1. **Hotel mappings not saving** - Variants save but hotels aren't persisted
2. **Hotel mappings not loading** - When reopening tour package, hotel assignments are lost

---

## 📊 Comprehensive Logging Added

### 1. Component Level (PackageVariantsTab.tsx)

#### **Initialization Logging** 🎬
```typescript
console.log('🎬 [VARIANTS INIT] Initializing PackageVariantsTab state...');
console.log('📋 [VARIANTS INIT] Current form value:', {
  exists: !!current,
  type: typeof current,
  isArray: Array.isArray(current),
  length: current?.length,
  data: current
});
```

#### **Hotel Mapping Updates** 🏨
```typescript
console.log('🏨 [HOTEL MAPPING] Updating hotel:', {
  variantIndex,
  variantName: variants[variantIndex]?.name,
  itineraryId,
  hotelId,
  hotelName: hotels.find(h => h.id === hotelId)?.name
});
```

#### **Form Sync** 🔄
```typescript
console.log('🔄 [VARIANTS SYNC] Syncing variants to form:', {
  variantsCount: variants.length,
  variants: variants.map(v => ({
    name: v.name,
    hotelMappingsCount: Object.keys(v.hotelMappings || {}).length,
    hotelMappings: v.hotelMappings
  }))
});
```

### 2. Form Submission Level (tourPackageQuery-form.tsx)

#### **Submit Start** 📤
```typescript
console.log('🔍 [SUBMIT START] Full form data.packageVariants:', data.packageVariants);
```

#### **Before API Call** 📦
```typescript
console.log('📦 [FORM SUBMIT] packageVariants data:', {
  type: typeof data.packageVariants,
  isArray: Array.isArray(data.packageVariants),
  length: data.packageVariants?.length,
  data: data.packageVariants,
  stringified: JSON.stringify(data.packageVariants, null, 2)
});
```

### 3. API Level (route.ts)

#### **Receiving Data** 📥
```typescript
console.log('📥 [API RECEIVE] packageVariants:', {
  received: !!packageVariants,
  type: typeof packageVariants,
  isArray: Array.isArray(packageVariants),
  length: packageVariants?.length,
  data: packageVariants
});
```

#### **Processing Variants** 🎨
```typescript
console.log(`🎨 [VARIANTS START] Processing ${packageVariants.length} package variants`);
console.log('🎨 [VARIANTS DATA] Full variants:', JSON.stringify(packageVariants, null, 2));
```

#### **Creating Each Variant** ✨
```typescript
console.log(`✨ [VARIANT CREATE] Creating variant:`, {
  name: variant.name,
  hotelMappingsCount: Object.keys(variant.hotelMappings || {}).length,
  hotelMappings: variant.hotelMappings
});
```

#### **Hotel Mappings** 🏨
```typescript
console.log(`🏨 [HOTEL MAPPINGS] Prepared ${mappings.length} mappings:`, mappings);
console.log(`✅ [MAPPINGS SAVED] Created ${mappings.length} hotel mappings`);
// OR
console.log(`⚠️ [NO MAPPINGS] Variant has no hotelMappings object or it's empty`);
```

#### **Retrieving Data (GET)** 📥
```typescript
console.log('📥 [API GET] Retrieved packageVariants:', {
  count: tourPackageQuery?.packageVariants?.length || 0,
  variants: tourPackageQuery?.packageVariants?.map(v => ({
    id: v.id,
    name: v.name,
    mappingsCount: v.variantHotelMappings?.length || 0,
    mappings: v.variantHotelMappings?.map(m => ({
      itineraryId: m.itineraryId,
      hotelId: m.hotelId,
      hotelName: m.hotel?.name
    }))
  }))
});
```

---

## 🔧 Critical Fix: Data Transformation

### **Problem Identified**

The API returns variants in this format:
```json
{
  "id": "variant-123",
  "name": "Luxury",
  "variantHotelMappings": [
    {
      "itineraryId": "itin-1",
      "hotelId": "hotel-abc",
      "hotel": { "name": "Taj Hotel" }
    },
    {
      "itineraryId": "itin-2",
      "hotelId": "hotel-def",
      "hotel": { "name": "Oberoi Resort" }
    }
  ]
}
```

But the component expects this format:
```json
{
  "id": "variant-123",
  "name": "Luxury",
  "hotelMappings": {
    "itin-1": "hotel-abc",
    "itin-2": "hotel-def"
  }
}
```

### **Solution: Transform Function**

Added `transformPackageVariants` function:

```typescript
const transformPackageVariants = (variants: any[]): any[] => {
  if (!variants || !Array.isArray(variants)) return [];
  
  console.log('🔄 [TRANSFORM VARIANTS] Transforming packageVariants from API:', {
    count: variants.length,
    rawData: variants
  });
  
  return variants.map(variant => {
    // Convert variantHotelMappings array to hotelMappings object
    const hotelMappings: { [itineraryId: string]: string } = {};
    
    if (variant.variantHotelMappings && Array.isArray(variant.variantHotelMappings)) {
      variant.variantHotelMappings.forEach((mapping: any) => {
        if (mapping.itineraryId && mapping.hotelId) {
          hotelMappings[mapping.itineraryId] = mapping.hotelId;
        }
      });
    }
    
    console.log(`🔄 [TRANSFORM] Variant "${variant.name}":`, {
      mappingsCount: Object.keys(hotelMappings).length,
      hotelMappings
    });
    
    return {
      id: variant.id,
      name: variant.name,
      description: variant.description,
      isDefault: variant.isDefault,
      sortOrder: variant.sortOrder,
      priceModifier: variant.priceModifier,
      hotelMappings  // ✅ Flat object format
    };
  });
};
```

### **Applied to defaultValues**

```typescript
const defaultValues = initialData
  ? {
      // ... other fields
      packageVariants: transformPackageVariants((initialData as any).packageVariants || []),
    } : {
      // ... other fields
      packageVariants: [],
    };
```

---

## 🧪 How to Debug

### **Step 1: Open Browser Console**
Press F12 or right-click → Inspect → Console tab

### **Step 2: Load Tour Package Query**
Navigate to edit an existing tour package query with variants

**Look for:**
```
📥 [API GET] Retrieved packageVariants: {...}
🔄 [TRANSFORM VARIANTS] Transforming packageVariants from API: {...}
🔄 [TRANSFORM] Variant "Luxury": {...}
🎬 [VARIANTS INIT] Initializing PackageVariantsTab state...
📋 [VARIANTS INIT] Current form value: {...}
✅ [VARIANTS INIT] Loaded from array: X variants
🏨 [VARIANTS INIT] Hotel mappings: [{...}]
```

### **Step 3: Assign Hotel to Variant**
Click a hotel dropdown and select a hotel

**Look for:**
```
🏨 [HOTEL MAPPING] Updating hotel: {
  variantIndex: 0,
  variantName: "Standard",
  itineraryId: "itin-abc-123",
  hotelId: "hotel-xyz-456",
  hotelName: "Taj Hotel"
}
🏨 [HOTEL MAPPING] Updated mappings: { "itin-abc-123": "hotel-xyz-456" }
🔄 [VARIANTS SYNC] Syncing variants to form: {...}
```

### **Step 4: Click Save**

**Look for:**
```
==== FORM SUBMISSION DIAGNOSIS ====
🔍 [SUBMIT START] Full form data.packageVariants: [...]
📦 [FORM SUBMIT] packageVariants data: {
  type: "object",
  isArray: true,
  length: 1,
  data: [...],
  stringified: "..."
}
```

### **Step 5: Check API Logs**

**Look for:**
```
📥 [API RECEIVE] packageVariants: {
  received: true,
  type: "object",
  isArray: true,
  length: 1,
  data: [...]
}
🎨 [VARIANTS START] Processing 1 package variants
🎨 [VARIANTS DATA] Full variants: [...]
✨ [VARIANT CREATE] Creating variant: {
  name: "Standard",
  hotelMappingsCount: 3,
  hotelMappings: { "itin-1": "hotel-abc", ... }
}
✅ [VARIANT CREATED] ID: variant-123, Name: Standard
🏨 [HOTEL MAPPINGS] Prepared 3 mappings: [...]
✅ [MAPPINGS SAVED] Created 3 hotel mappings for variant: Standard
```

---

## 🎯 What Each Log Tells You

| Log Message | What It Means |
|-------------|---------------|
| `🎬 [VARIANTS INIT]` | Component is loading, check if data from form |
| `🏨 [HOTEL MAPPING]` | User clicked hotel, check itineraryId & hotelId |
| `🔄 [VARIANTS SYNC]` | Data syncing to form, check hotelMappings object |
| `📦 [FORM SUBMIT]` | Form submitting, verify it's an array |
| `📥 [API RECEIVE]` | API got data, verify structure |
| `🎨 [VARIANTS START]` | API processing variants |
| `✨ [VARIANT CREATE]` | Creating variant in DB, check mappings count |
| `🏨 [HOTEL MAPPINGS]` | About to save mappings, verify array has items |
| `✅ [MAPPINGS SAVED]` | Successfully saved to DB |
| `⚠️ [NO MAPPINGS]` | **WARNING**: No mappings found - THIS IS THE ISSUE |
| `📥 [API GET]` | Loading from DB, check what was retrieved |
| `🔄 [TRANSFORM]` | Converting API format to component format |

---

## 🚨 Common Issues to Look For

### Issue 1: Empty hotelMappings Object
```
✨ [VARIANT CREATE] Creating variant: {
  name: "Standard",
  hotelMappingsCount: 0,  // ❌ Should be > 0 if hotels assigned
  hotelMappings: {}       // ❌ Empty!
}
⚠️ [NO MAPPINGS] Variant has no hotelMappings object or it's empty
```

**Cause:** Hotels not being added to variant state  
**Fix:** Check hotel mapping update logic

### Issue 2: Wrong Itinerary ID Format
```
🏨 [HOTEL MAPPING] Updating hotel: {
  itineraryId: undefined,  // ❌ Should be a string UUID
  hotelId: "hotel-abc-123"
}
```

**Cause:** Itinerary doesn't have ID or using index instead  
**Fix:** Ensure itineraries have proper IDs

### Issue 3: Data Not Transforming
```
📋 [VARIANTS INIT] Current form value: {
  exists: true,
  type: "object",
  isArray: true,
  length: 1,
  data: [{ 
    variantHotelMappings: [...],  // ❌ Wrong format!
    hotelMappings: undefined      // ❌ Missing!
  }]
}
```

**Cause:** Transform function not applied  
**Fix:** Verify transformPackageVariants is being called

---

## 📁 Files Modified

1. ✅ `src/components/tour-package-query/PackageVariantsTab.tsx`
   - Added comprehensive logging throughout
   - Enhanced initialization logging
   - Added hotel mapping update logging
   - Added form sync logging

2. ✅ `src/app/(dashboard)/tourPackageQuery/[tourPackageQueryId]/components/tourPackageQuery-form.tsx`
   - Added transformPackageVariants function
   - Updated defaultValues to use transformation
   - Added form submission logging

3. ✅ `src/app/api/tourPackageQuery/[tourPackageQueryId]/route.ts`
   - Added API receive logging
   - Added variant processing logging
   - Added hotel mappings creation logging
   - Added GET request logging

---

## 🎯 Next Steps

1. **Reload browser** (Ctrl+F5)
2. **Open Tour Package Query** in edit mode
3. **Open Console** (F12)
4. **Assign hotels** to variants
5. **Click Save**
6. **Review logs** in order shown above
7. **Share logs** if issue persists

---

**Expected Result:** You should see the complete flow from hotel selection → form sync → API submission → DB save → retrieval → display

**If still not working:** Send screenshot of console logs showing the flow from hotel selection through save!
