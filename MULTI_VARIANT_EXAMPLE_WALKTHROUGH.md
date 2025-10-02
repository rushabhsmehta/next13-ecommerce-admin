# Multi-Variant Tour Package - Example Walkthrough

## Example: Kashmir Paradise 7N/8D Tour

### Common Itinerary (Shared Across All Variants)

| Day | Location | Activities |
|-----|----------|------------|
| 1 | Srinagar | Airport pickup, Shikara ride on Dal Lake, Mughal Gardens tour |
| 2 | Srinagar → Gulmarg | Drive to Gulmarg (2 hrs), Gondola ride, Snow activities |
| 3 | Gulmarg | Full day in Gulmarg, Apharwat Peak, Local sightseeing |
| 4 | Gulmarg → Pahalgam | Drive to Pahalgam (4 hrs), Betaab Valley visit |
| 5 | Pahalgam | Aru Valley, Chandanwari, Horse riding |
| 6 | Pahalgam → Srinagar | Return to Srinagar, Shopping at Lal Chowk |
| 7 | Srinagar | Free day, Optional activities |
| 8 | Srinagar | Departure |

---

## Variant 1: LUXURY ⭐⭐⭐⭐⭐

**Price Modifier:** +50% from base
**Target:** High-end travelers seeking ultimate comfort

### Hotel Assignments:

| Day | Location | Hotel | Category |
|-----|----------|-------|----------|
| 1-2, 6-8 | Srinagar | The LaLiT Grand Palace Srinagar | 5⭐ Palace Hotel |
| 3-4 | Gulmarg | The Khyber Himalayan Resort & Spa | 5⭐ Luxury Resort |
| 5-6 | Pahalgam | WelcomHotel Pine N Peak | 5⭐ Premium |

**Features:**
- Premium rooms with Dal Lake/Mountain views
- 5-star dining experiences
- Spa and wellness facilities
- Concierge services
- Airport transfers in luxury vehicles

**Price Example:**
- Base Package: ₹35,000 per person
- Luxury Package: ₹52,500 per person (50% premium)

---

## Variant 2: PREMIUM ⭐⭐⭐⭐

**Price Modifier:** +25% from base
**Target:** Travelers wanting comfort without breaking the bank

### Hotel Assignments:

| Day | Location | Hotel | Category |
|-----|----------|-------|----------|
| 1-2, 6-8 | Srinagar | Vivanta Dal View | 4⭐ Premium |
| 3-4 | Gulmarg | Hotel Highlands Park | 4⭐ |
| 5-6 | Pahalgam | Hotel Heevan Pahalgam | 4⭐ |

**Features:**
- Comfortable rooms with good views
- Quality dining options
- Standard amenities
- Professional service
- Airport transfers in comfortable vehicles

**Price Example:**
- Base Package: ₹35,000 per person
- Premium Package: ₹43,750 per person (25% premium)

---

## Variant 3: STANDARD ⭐⭐⭐ (Default)

**Price Modifier:** 0% (Base price)
**Target:** Budget-conscious families and groups

### Hotel Assignments:

| Day | Location | Hotel | Category |
|-----|----------|-------|----------|
| 1-2, 6-8 | Srinagar | Hotel City Star | 3⭐ |
| 3-4 | Gulmarg | Pine Palace Resort | 3⭐ |
| 5-6 | Pahalgam | Hotel Paradise | 3⭐ |

**Features:**
- Clean, comfortable rooms
- Basic amenities
- Good value for money
- Friendly staff
- Shared airport transfers

**Price Example:**
- Standard Package: ₹35,000 per person (base)

---

## How Customers See It

### On the Website/Display:

```
┌─────────────────────────────────────────────────────────┐
│         Kashmir Paradise 7N/8D Tour                     │
├─────────────────────────────────────────────────────────┤
│ Select Your Experience:                                 │
│                                                          │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│ │   LUXURY     │  │   PREMIUM    │  │   STANDARD   │  │
│ │              │  │              │  │  (Popular)   │  │
│ │  ₹52,500/px  │  │  ₹43,750/px  │  │  ₹35,000/px  │  │
│ │              │  │              │  │              │  │
│ │  5⭐ Hotels   │  │  4⭐ Hotels   │  │  3⭐ Hotels   │  │
│ │  [View]      │  │  [View]      │  │  [View]      │  │
│ └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

When user clicks "View" on any variant:
- Shows the complete itinerary with that variant's hotels
- Hotel images and details per day
- Price breakdown
- Compare button to see all variants side-by-side

---

## Admin/Agent View (Your System)

### Package Variants Tab:

```
┌─────────────────────────────────────────────────────────┐
│  Package Variants                      [+ Add Variant]  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [Luxury] [Premium] [Standard ✓]                       │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Variant Settings                                   │ │
│  │                                                     │ │
│  │ Name: Standard                                     │ │
│  │ Description: Budget-friendly 3-star options        │ │
│  │ Price Modifier: 0%                                 │ │
│  │ ☑ Set as default variant                           │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Hotel Assignments                                  │ │
│  │                                                     │ │
│  │ Day 1-2: Srinagar                                  │ │
│  │   Hotel: [Hotel City Star          ▼]             │ │
│  │   [Hotel Image]                                    │ │
│  │                                                     │ │
│  │ Day 3-4: Gulmarg                                   │ │
│  │   Hotel: [Pine Palace Resort       ▼]             │ │
│  │   [Hotel Image]                                    │ │
│  │                                                     │ │
│  │ Day 5-6: Pahalgam                                  │ │
│  │   Hotel: [Hotel Paradise           ▼]             │ │
│  │   [Hotel Image]                                    │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Data Structure in Database

### Package Variants Table:

| id | name | description | tourPackageQueryId | isDefault | sortOrder | priceModifier |
|----|------|-------------|-------------------|-----------|-----------|---------------|
| v1 | Luxury | Premium 5-star... | tpq123 | false | 0 | 50 |
| v2 | Premium | Comfortable 4-star... | tpq123 | true | 1 | 25 |
| v3 | Standard | Budget-friendly... | tpq123 | false | 2 | 0 |

### Variant Hotel Mappings Table:

| id | packageVariantId | itineraryId | hotelId |
|----|-----------------|-------------|---------|
| m1 | v1 (Luxury) | day1-2 | lalit-palace |
| m2 | v1 (Luxury) | day3-4 | khyber-resort |
| m3 | v1 (Luxury) | day5-6 | welcomhotel |
| m4 | v2 (Premium) | day1-2 | vivanta-dal |
| m5 | v2 (Premium) | day3-4 | highlands |
| m6 | v2 (Premium) | day5-6 | heevan |
| m7 | v3 (Standard) | day1-2 | city-star |
| m8 | v3 (Standard) | day3-4 | pine-palace |
| m9 | v3 (Standard) | day5-6 | paradise |

---

## Benefits for Your Business

### 1. **Single Itinerary Management**
- Update activities once → applies to all variants
- Add/remove days → automatically reflected
- Change destinations → no duplication

### 2. **Flexible Pricing**
- Cater to different budget segments
- Upsell opportunities
- Easy price comparison

### 3. **Better Customer Experience**
- Clear choices
- Transparent pricing
- Visual comparison

### 4. **Operational Efficiency**
- Less data duplication
- Easier updates
- Consistent information

### 5. **Marketing Advantages**
- "Starting from ₹35,000" (shows Standard)
- "Luxury options available"
- Easy A/B testing of different hotel combinations

---

## Reporting & Analytics

You can now track:
- Which variant sells the most?
- Conversion rates per variant
- Average booking value by variant
- Seasonal preferences
- Location-wise variant popularity

**Example Query:**
```sql
SELECT 
  pv.name as variant_name,
  COUNT(*) as bookings,
  AVG(tpq.totalPrice) as avg_price
FROM TourPackageQuery tpq
JOIN PackageVariant pv ON tpq.selectedVariantId = pv.id
WHERE tpq.locationId = 'kashmir'
GROUP BY pv.name
ORDER BY bookings DESC;
```

---

## Migration Path for Existing Packages

### Existing packages (without variants):
- Continue to work normally
- `itinerary.hotelId` is used
- No changes required

### Converting to multi-variant:
1. Create "Standard" variant with existing hotels
2. Add "Premium" and "Luxury" variants
3. Assign appropriate hotels to each

### Gradual Adoption:
- New packages: Use variants from day 1
- Popular packages: Convert to variants
- Old packages: Keep as is (optional conversion)

---

**This is your complete multi-variant system! 🎉**

You can now offer customers the same amazing Kashmir tour with different hotel options based on their budget and preferences.
