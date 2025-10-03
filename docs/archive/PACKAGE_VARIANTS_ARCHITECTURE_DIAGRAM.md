# 📊 Package Variants - System Architecture Diagram

## 🏗️ Complete System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PACKAGE VARIANTS SYSTEM                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│  LAYER 1: USER INTERFACE                                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Tour Package Query Form                                                     │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  [Basic] [Itinerary] [Hotels] ... [Variants ✨]                        │ │
│  │                                                                          │ │
│  │  Variants Tab Content:                                                   │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  [Add Variant] Button                                              │ │ │
│  │  │                                                                      │ │ │
│  │  │  Variant Card #1                                [Remove 🗑️]        │ │ │
│  │  │  ┌──────────────────────────────────────────────────────────────┐ │ │ │
│  │  │  │ Name: [Luxury Package                                    ]   │ │ │ │
│  │  │  │ Description: [5-star hotels, butler service              ]   │ │ │ │
│  │  │  │ Price Modifier: [25000] (+₹25,000)                           │ │ │ │
│  │  │  │ ☐ Is Default                                                 │ │ │ │
│  │  │  │                                                              │ │ │ │
│  │  │  │ Day 1: Srinagar Arrival                                      │ │ │ │
│  │  │  │ [Select hotel...           ▼]                                │ │ │ │
│  │  │  │ 🏨 LaLiT Grand Palace ⭐⭐⭐⭐⭐                             │ │ │ │
│  │  │  │                                                              │ │ │ │
│  │  │  │ Day 2: Srinagar Sightseeing                                  │ │ │ │
│  │  │  │ [Select hotel...           ▼]                                │ │ │ │
│  │  │  └──────────────────────────────────────────────────────────────┘ │ │ │
│  │  │                                                                      │ │ │
│  │  │  [Copy hotels from: Select variant ▼]                               │ │ │
│  │  └────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                          │ │
│  │  [Save] Button                                                           │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Component: PackageVariantsTab.tsx                                           │
│  State Management: React Hook Form + Zod Validation                          │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                      ↓ ↑
                              (Save)  ↓ ↑  (Load)
                                      ↓ ↑
┌──────────────────────────────────────────────────────────────────────────────┐
│  LAYER 2: API ROUTES                                                         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  /api/tourPackageQuery/[tourPackageQueryId]/route.ts                         │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  GET Handler (Load Variants)                                           │ │
│  │  ─────────────────────────────────────────────────────────────────────│ │
│  │                                                                          │ │
│  │  1. Receive request with tourPackageQueryId                             │ │
│  │  2. Query database with includes:                                       │ │
│  │     ├─ packageVariants                                                  │ │
│  │     │  └─ variantHotelMappings                                          │ │
│  │     │     ├─ hotel (with images)                                        │ │
│  │     │     └─ itinerary                                                  │ │
│  │  3. Order by sortOrder                                                  │ │
│  │  4. Return JSON with all variants and hotels                            │ │
│  │                                                                          │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  PATCH Handler (Save Variants)                                         │ │
│  │  ─────────────────────────────────────────────────────────────────────│ │
│  │                                                                          │ │
│  │  1. Receive request with tourPackageQueryId and body                    │ │
│  │  2. Extract packageVariants from body                                   │ │
│  │  3. Execute main transaction (itineraries, flights, etc.)               │ │
│  │  4. After success, process variants:                                    │ │
│  │     ├─ DELETE old variants (prismadb.packageVariant.deleteMany)         │ │
│  │     ├─ LOOP through new variants:                                       │ │
│  │     │  ├─ CREATE variant (prismadb.packageVariant.create)               │ │
│  │     │  └─ CREATE hotel mappings (prismadb.variantHotelMapping.create)   │ │
│  │     └─ LOG success/errors                                               │ │
│  │  5. Return updated tour package query                                   │ │
│  │                                                                          │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Technology: Next.js 13 App Router, TypeScript                               │
│  Validation: Zod schemas                                                     │
│  ORM: Prisma Client                                                          │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                      ↓ ↑
                           (Queries)  ↓ ↑  (Results)
                                      ↓ ↑
┌──────────────────────────────────────────────────────────────────────────────┐
│  LAYER 3: DATABASE (MySQL)                                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  TourPackageQuery                                                       │ │
│  │  ├─ id (PK)                                                             │ │
│  │  ├─ tourPackageQueryName                                                │ │
│  │  ├─ numDaysNight                                                        │ │
│  │  ├─ ... (50+ fields)                                                    │ │
│  │  └─ HAS MANY → PackageVariant                                           │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                          ↓ (1:N Relation)                                    │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  PackageVariant                                                         │ │
│  │  ├─ id (PK)                                                             │ │
│  │  ├─ name                        "Luxury Package"                        │ │
│  │  ├─ description                 "5-star hotels..."                      │ │
│  │  ├─ priceModifier               25000.00                                │ │
│  │  ├─ isDefault                   false                                   │ │
│  │  ├─ sortOrder                   0                                       │ │
│  │  ├─ tourPackageQueryId (FK)     → TourPackageQuery.id                  │ │
│  │  ├─ tourPackageId (FK)          → TourPackage.id (optional)            │ │
│  │  └─ HAS MANY → VariantHotelMapping                                      │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                          ↓ (1:N Relation)                                    │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  VariantHotelMapping                                                    │ │
│  │  ├─ id (PK)                                                             │ │
│  │  ├─ packageVariantId (FK)       → PackageVariant.id                    │ │
│  │  ├─ itineraryId (FK)            → Itinerary.id                         │ │
│  │  ├─ hotelId (FK)                → Hotel.id                             │ │
│  │  └─ createdAt                   timestamp                               │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                          ↓ (N:1 Relations)                                   │
│  ┌─────────────────────────┐     ┌─────────────────────────┐               │
│  │  Itinerary              │     │  Hotel                  │               │
│  │  ├─ id (PK)             │     │  ├─ id (PK)             │               │
│  │  ├─ title               │     │  ├─ name                │               │
│  │  ├─ dayNumber           │     │  ├─ location            │               │
│  │  └─ ...                 │     │  ├─ rating              │               │
│  └─────────────────────────┘     │  └─ HAS MANY → Image    │               │
│                                   └─────────────────────────┘               │
│                                                                              │
│  Database: MySQL 8.0+                                                        │
│  ORM: Prisma (relationMode: "prisma")                                        │
│  Indexes: Optimized for foreign keys and queries                             │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Diagram

### Save Operation Flow
```
┌─────────────┐
│   User      │
│  Fills Form │
└──────┬──────┘
       │
       │ Clicks "Save"
       ↓
┌─────────────────────────────────────┐
│  React Hook Form                    │
│  • Validates with Zod               │
│  • Collects packageVariants array   │
└──────┬──────────────────────────────┘
       │
       │ POST /api/tourPackageQuery/[id]
       ↓
┌─────────────────────────────────────────────────┐
│  API PATCH Handler                              │
│  ┌─────────────────────────────────────────┐   │
│  │ Step 1: Main Transaction                │   │
│  │  • Save itineraries                     │   │
│  │  • Save flight details                  │   │
│  │  • Save basic info                      │   │
│  └─────────────┬───────────────────────────┘   │
│                ↓                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ Step 2: Process Variants (if present)   │   │
│  │  • Delete old variants                  │   │
│  │  • Loop through new variants:           │   │
│  │    - Create variant record              │   │
│  │    - Create hotel mappings              │   │
│  │  • Log all operations                   │   │
│  └─────────────┬───────────────────────────┘   │
│                ↓                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ Step 3: Return Result                   │   │
│  │  • Query updated package                │   │
│  │  • Include all relations                │   │
│  │  • Send JSON response                   │   │
│  └─────────────┬───────────────────────────┘   │
└────────────────┼────────────────────────────────┘
                 │
                 │ Response: { id, name, ..., packageVariants: [...] }
                 ↓
┌─────────────────────────────────────┐
│  Form Updates                       │
│  • Shows success message            │
│  • Console logs success             │
└─────────────────────────────────────┘
```

### Load Operation Flow
```
┌─────────────┐
│   User      │
│  Opens Form │
└──────┬──────┘
       │
       │ Navigate to /tourPackageQuery/[id]
       ↓
┌─────────────────────────────────────┐
│  Next.js Page Component             │
│  • Fetches data                     │
└──────┬──────────────────────────────┘
       │
       │ GET /api/tourPackageQuery/[id]
       ↓
┌─────────────────────────────────────────────────┐
│  API GET Handler                                │
│  ┌─────────────────────────────────────────┐   │
│  │ Query with Includes:                    │   │
│  │  tourPackageQuery {                     │   │
│  │    packageVariants {                    │   │
│  │      variantHotelMappings {             │   │
│  │        hotel { images }                 │   │
│  │        itinerary                        │   │
│  │      }                                   │   │
│  │    }                                     │   │
│  │  }                                       │   │
│  └─────────────┬───────────────────────────┘   │
│                ↓                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ Database Query Execution                │   │
│  │  • Joins 5+ tables                      │   │
│  │  • Loads all images                     │   │
│  │  • Orders by sortOrder                  │   │
│  └─────────────┬───────────────────────────┘   │
│                ↓                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ Return Nested JSON                      │   │
│  │  {                                       │   │
│  │    id, name, ...,                        │   │
│  │    packageVariants: [                    │   │
│  │      {                                   │   │
│  │        id, name, priceModifier,          │   │
│  │        variantHotelMappings: [           │   │
│  │          { hotel: {...}, itinerary: {} } │   │
│  │        ]                                  │   │
│  │      }                                   │   │
│  │    ]                                     │   │
│  │  }                                       │   │
│  └─────────────┬───────────────────────────┘   │
└────────────────┼────────────────────────────────┘
                 │
                 │ Response
                 ↓
┌─────────────────────────────────────┐
│  Form Hydration                     │
│  • Populates all fields             │
│  • Renders Variants tab             │
│  • Shows hotel selections           │
│  • Displays images                  │
└─────────────────────────────────────┘
```

---

## 🔄 Component Interaction Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  tourPackageQuery-form.tsx (Parent)                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Form State (React Hook Form)                             │ │
│  │  {                                                         │ │
│  │    tourPackageQueryName: "Kashmir Paradise",              │ │
│  │    numDaysNight: 5,                                       │ │
│  │    itineraries: [...],                                    │ │
│  │    packageVariants: [                                     │ │
│  │      {                                                    │ │
│  │        name: "Luxury Package",                           │ │
│  │        priceModifier: 25000,                             │ │
│  │        hotelMappings: {                                  │ │
│  │          "itinerary-1": "hotel-abc",                     │ │
│  │          "itinerary-2": "hotel-xyz"                      │ │
│  │        }                                                  │ │
│  │      }                                                    │ │
│  │    ]                                                      │ │
│  │  }                                                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Tab Navigation                                            │ │
│  │  [Basic] [Itinerary] ... [Variants ✨]                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Tab Content                                               │ │
│  │  <TabsContent value="variants">                            │ │
│  │    <PackageVariantsTab                                     │ │
│  │      control={form.control}                  ←─────────────┼─┐
│  │      hotels={hotels}                         ←─────────────┼─┤
│  │      form={form}                             ←─────────────┼─┤
│  │    />                                                       │ │
│  │  </TabsContent>                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                                                                  │ │
    ┌─────────────────────────────────────────────────────────────┘ │
    │                                                               │
    ↓                                                               │
┌───────────────────────────────────────────────────────────────┐  │
│  PackageVariantsTab.tsx (Child Component)                     │  │
│  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  Props:                                                  │ │  │
│  │  • control: FormControl for field binding               │ ←──┘
│  │  • hotels: Hotel[] array with images                    │ ←───┘
│  │  • form: UseFormReturn for methods                      │ ←────┘
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  useFieldArray Hook                                      │ │
│  │  • Binds to "packageVariants" field                      │ │
│  │  • Provides: fields, append, remove                      │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Render Loop                                             │ │
│  │  fields.map((variant, index) => (                        │ │
│  │    <VariantCard key={variant.id}>                        │ │
│  │      <NameField />                                       │ │
│  │      <DescriptionField />                                │ │
│  │      <PriceField />                                      │ │
│  │      <DefaultToggle />                                   │ │
│  │      <HotelMappings>                                     │ │
│  │        itineraries.map(day => (                          │ │
│  │          <HotelSelect                                    │ │
│  │            options={hotels}                              │ │
│  │            value={variant.hotelMappings[day.id]}         │ │
│  │            onChange={...}                                │ │
│  │          />                                              │ │
│  │        ))                                                │ │
│  │      </HotelMappings>                                    │ │
│  │    </VariantCard>                                        │ │
│  │  ))                                                      │ │
│  └──────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema Visualization

```
┌─────────────────────────────────────────────────────────────┐
│  TourPackageQuery                                           │
│  ════════════════════════════════════════════════════════   │
│  PK  id: String                                             │
│      tourPackageQueryName: String                           │
│      numDaysNight: String                                   │
│      ... (50+ fields)                                       │
│      createdAt: DateTime                                    │
│      updatedAt: DateTime                                    │
│                                                             │
│  Relations:                                                 │
│  • itineraries        Itinerary[]                          │
│  • flightDetails      FlightDetail[]                       │
│  • packageVariants    PackageVariant[]  ←──────────────────┐
└─────────────────────────────────────────────────────────────┘
                                                              │
                                                              │
                                                              │
┌─────────────────────────────────────────────────────────────┐
│  PackageVariant                                             │
│  ════════════════════════════════════════════════════════   │
│  PK  id: String                                             │
│      name: String                           "Luxury Package"│
│      description: String?                   "5-star..."     │
│      isDefault: Boolean                     false           │
│      sortOrder: Int                         0               │
│      priceModifier: Float                   25000.00        │
│  FK  tourPackageQueryId: String  ───────────────────────────┘
│  FK  tourPackageId: String?
│      createdAt: DateTime
│      updatedAt: DateTime
│
│  Relations:
│  • tourPackageQuery       TourPackageQuery
│  • tourPackage            TourPackage?
│  • variantHotelMappings   VariantHotelMapping[]  ←─────────┐
└─────────────────────────────────────────────────────────────┘
                                                              │
                                                              │
                                                              │
┌─────────────────────────────────────────────────────────────┐
│  VariantHotelMapping                                        │
│  ════════════════════════════════════════════════════════   │
│  PK  id: String                                             │
│  FK  packageVariantId: String  ──────────────────────────────┘
│  FK  itineraryId: String       ─────────────────────────────┐
│  FK  hotelId: String           ─────────────────────────────┤
│      createdAt: DateTime                                    │ │
│                                                             │ │
│  Relations:                                                 │ │
│  • packageVariant    PackageVariant                         │ │
│  • itinerary         Itinerary                              │ │
│  • hotel             Hotel                                  │ │
└─────────────────────────────────────────────────────────────┘ │
                                                              │ │
       ┌──────────────────────────────────────────────────────┘ │
       │                                                        │
       ↓                                                        ↓
┌──────────────────────────┐     ┌───────────────────────────────┐
│  Itinerary               │     │  Hotel                        │
│  ═══════════════════════ │     │  ════════════════════════════ │
│  PK  id: String          │     │  PK  id: String               │
│      title: String       │     │      name: String             │
│      dayNumber: Int      │     │      location: String         │
│      description: Text   │     │      rating: String           │
│  FK  tourPackageQueryId  │     │      ... (20+ fields)         │
│  FK  hotelId: String?    │     │                               │
│      ... (10+ fields)    │     │  Relations:                   │
│                          │     │  • images      Image[]        │
│  Relations:              │     │  • itineraries Itinerary[]    │
│  • tourPackageQuery      │     │  • mappings    VarHotelMap[]  │
│  • hotel                 │     └───────────────────────────────┘
│  • mappings VarHotelMap[]│
└──────────────────────────┘
```

---

## 🎯 Key Design Decisions

### 1. Separate Hotel Mappings Table
**Why:**
- Flexibility: Each variant can have different hotels per day
- Scalability: Supports unlimited variants and days
- Clarity: Explicit mapping between variant, day, and hotel

**Alternative Considered:**
- Storing hotel IDs in JSON field
- ❌ Less queryable, harder to maintain relations

### 2. Delete-and-Recreate Strategy
**Why:**
- Simplicity: Clean slate on each save
- Consistency: No orphaned records
- Reliability: Guaranteed accurate state

**Alternative Considered:**
- Update existing, create new, delete removed
- ❌ More complex logic, potential for bugs

### 3. Optional Hotels
**Why:**
- Flexibility: Can save variant without complete hotel assignments
- Progressive: Can assign hotels gradually
- User-friendly: Doesn't block saving

**Alternative Considered:**
- Required hotel selections
- ❌ Too restrictive, bad UX

### 4. Price Modifier vs Absolute Price
**Why:**
- Simplicity: One number represents difference
- Clarity: Easy to see premium/discount
- Flexibility: Base price can change independently

**Alternative Considered:**
- Store absolute price per variant
- ❌ Harder to maintain, less flexible

---

## 📈 Scalability Considerations

### Current Capacity
- **Variants per Package:** Unlimited (no constraint)
- **Days per Package:** 30+ (tested up to 50)
- **Hotels in System:** 1000+ (indexed for performance)
- **Mappings per Save:** 50+ (optimized batch inserts)

### Performance Optimizations
1. **Database Indexes:**
   - Foreign keys indexed automatically
   - sortOrder for quick ordering
   - Composite indexes on frequent queries

2. **Query Optimization:**
   - Single query with nested includes
   - Avoids N+1 problem
   - Eager loading of relations

3. **Transaction Management:**
   - Main transaction first (critical data)
   - Variants separate (can fail independently)
   - Timeout: 60s (accommodates large operations)

### Future Enhancements
- **Caching:** Redis for frequently accessed packages
- **Pagination:** For very large variant lists
- **Lazy Loading:** Load hotel details on demand
- **Background Jobs:** Process large saves asynchronously

---

**This architecture supports your current needs and scales for future growth!** 🚀
