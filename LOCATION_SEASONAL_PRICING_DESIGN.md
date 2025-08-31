# 🌍 Location-Based Seasonal Pricing System Design

## 🎯 **Objective**
Implement location-specific seasonal periods (Off Season, Peak Season) that automatically suggest pricing periods when creating tour package seasonal pricing.

## 📊 **System Architecture**

### **1. Database Schema Extensions**

#### **A) New Model: `LocationSeasonalPeriod`**
```prisma
model LocationSeasonalPeriod {
  id          String   @id @default(uuid())
  locationId  String
  seasonType  String   // "OFF_SEASON" | "PEAK_SEASON" | "SHOULDER_SEASON"
  name        String   // "Winter Off Season", "Summer Peak Season"
  startMonth  Int      // 1-12 (January = 1)
  startDay    Int      // 1-31
  endMonth    Int      // 1-12 (December = 12)
  endDay      Int      // 1-31
  description String?  @db.Text
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  location    Location @relation(fields: [locationId], references: [id], onDelete: Cascade)
  
  @@index([locationId])
  @@index([seasonType])
  @@index([startMonth, startDay])
  @@index([endMonth, endDay])
}
```

#### **B) Enhanced Model: `TourPackagePricing`**
```prisma
model TourPackagePricing {
  // ... existing fields ...
  locationSeasonalPeriodId String? // Link to predefined seasonal period
  locationSeasonalPeriod   LocationSeasonalPeriod? @relation(fields: [locationSeasonalPeriodId], references: [id])
  
  @@index([locationSeasonalPeriodId])
}
```

### **2. Frontend UX Design**

#### **A) Location Seasonal Periods Management Page**
- **Path**: `/locations/[locationId]/seasonal-periods`
- **Features**:
  - Visual calendar view of seasonal periods
  - Color-coded seasons (Red=Peak, Blue=Off, Yellow=Shoulder)
  - Drag-and-drop period adjustment
  - Overlap detection and warnings
  - Year-round period validation

#### **B) Enhanced Tour Package Pricing Form**
- **Smart Period Suggestions**:
  - Auto-load location's seasonal periods
  - Quick-select buttons for predefined periods
  - Option to create custom periods
  - Visual period timeline
  - Conflict detection with existing pricing

#### **C) Period Selection Interface**
```
┌─────────────────────────────────────────────────┐
│ 🌍 Location: Goa                               │
├─────────────────────────────────────────────────┤
│ 📅 Available Seasonal Periods:                 │
│                                                 │
│ 🔵 Off Season     │ May 1 - Sep 30   │ [Select]│
│ 🔴 Peak Season    │ Dec 15 - Jan 15  │ [Select]│
│ 🟡 Shoulder Season│ Oct 1 - Dec 14   │ [Select]│
│                                                 │
│ ➕ Create Custom Period                        │
├─────────────────────────────────────────────────┤
│ 📊 Selected Period: Peak Season                │
│ 📆 Dec 15, 2024 - Jan 15, 2025                │
│ 🏨 Rooms: [2] 🍽️ Meal Plan: [CP]             │
└─────────────────────────────────────────────────┘
```

### **3. Business Logic & Workflow**

#### **A) Location Setup Workflow**
1. **Admin creates location seasonal periods**
2. **System validates period coverage and overlaps**
3. **Periods become available for tour package pricing**

#### **B) Tour Package Pricing Workflow**
1. **User selects tour package location**
2. **System loads available seasonal periods**
3. **User chooses predefined period OR creates custom**
4. **System pre-fills dates from selected period**
5. **User configures pricing components**
6. **System validates against existing pricing periods**

#### **C) Smart Conflict Resolution**
- **Overlap Detection**: Check existing pricing periods
- **Gap Analysis**: Identify uncovered date ranges
- **Period Merging**: Suggest combining adjacent periods
- **Override Options**: Allow custom periods when needed

### **4. Key Features**

#### **A) Location Management**
- ✅ **Seasonal Period Templates**: Common patterns (Hill Station, Beach, City)
- ✅ **Bulk Period Creation**: Apply templates to multiple locations
- ✅ **Period Analytics**: Usage statistics and pricing trends
- ✅ **Historical Data**: Track seasonal pricing performance

#### **B) Tour Package Pricing**
- ✅ **Smart Suggestions**: Auto-suggest based on location and dates
- ✅ **Quick Period Selection**: One-click period application
- ✅ **Visual Timeline**: See all pricing periods on calendar
- ✅ **Conflict Resolution**: Handle overlapping periods gracefully

#### **C) Advanced Features**
- ✅ **Dynamic Pricing**: Adjust prices based on season type
- ✅ **Bulk Updates**: Update all packages for a seasonal period
- ✅ **Template Pricing**: Save pricing templates per season type
- ✅ **Market Analysis**: Compare seasonal pricing across locations

### **5. Implementation Phases**

#### **Phase 1: Core Foundation** (Week 1)
- [ ] Database schema migration
- [ ] Basic CRUD APIs for LocationSeasonalPeriod
- [ ] Location seasonal periods management page
- [ ] Basic period creation and editing

#### **Phase 2: Integration** (Week 2)
- [ ] Enhanced tour package pricing form
- [ ] Period selection interface
- [ ] Smart suggestions implementation
- [ ] Conflict detection and resolution

#### **Phase 3: Advanced Features** (Week 3)
- [ ] Visual calendar interface
- [ ] Bulk operations and templates
- [ ] Analytics and reporting
- [ ] Performance optimization

#### **Phase 4: Polish & Testing** (Week 4)
- [ ] UI/UX refinements
- [ ] Comprehensive testing
- [ ] Documentation and training
- [ ] Production deployment

### **6. Technical Considerations**

#### **A) Date Handling**
- **Timezone Awareness**: Use existing timezone utilities
- **Year Rollover**: Handle periods crossing calendar years
- **Leap Year Support**: Account for February 29th
- **Recurrence Logic**: Annual period repetition

#### **B) Performance**
- **Caching**: Cache seasonal periods per location
- **Indexing**: Optimized database queries
- **Lazy Loading**: Load periods only when needed
- **Background Jobs**: Bulk operations via queues

#### **C) Data Integrity**
- **Validation**: Ensure period consistency
- **Constraints**: Prevent invalid date ranges
- **Audit Trail**: Track period changes
- **Backup Strategy**: Data protection measures

## 🎨 **UI/UX Mockups**

### **Location Seasonal Periods Page**
```
┌─────────────────────────────────────────────────────────┐
│ 🌍 Goa - Seasonal Periods                              │
├─────────────────────────────────────────────────────────┤
│                    📅 Calendar View                    │
│ Jan │Feb │Mar │Apr │May │Jun │Jul │Aug │Sep │Oct │Nov │Dec│
│ 🔴🔴│    │    │    │🔵🔵│🔵🔵│🔵🔵│🔵🔵│🔵🔵│🟡🟡│🟡🟡│🔴🔴│
│Peak │    │    │    │ Off Season Period │  Shoulder │Peak│
│     │    │    │    │                   │  Season   │    │
├─────────────────────────────────────────────────────────┤
│                   📋 Period List                       │
│ 🔴 Peak Season    │ Dec 15 - Jan 15 │ Active │ [Edit] │
│ 🔵 Off Season     │ May 1 - Sep 30  │ Active │ [Edit] │
│ 🟡 Shoulder Season│ Oct 1 - Dec 14  │ Active │ [Edit] │
│                                              │ [+ Add] │
└─────────────────────────────────────────────────────────┘
```

### **Enhanced Tour Package Pricing Form**
```
┌─────────────────────────────────────────────────────────┐
│ 🏖️ Tour Package: Goa Beach Paradise                   │
├─────────────────────────────────────────────────────────┤
│ 📍 Location: Goa                                       │
│                                                         │
│ 🎯 Quick Period Selection:                             │
│ [🔴 Peak Season ] [🔵 Off Season ] [🟡 Shoulder] [✏️ Custom]│
│                                                         │
│ 📅 Selected: Peak Season (Dec 15 - Jan 15)            │
│ 🏨 Rooms: [2] 🍽️ Meal Plan: [Continental Plan]        │
│                                                         │
│ 💰 Pricing Components:                                 │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Hotel Charges    │ ₹5,000 │ ₹4,500 │ Per room/night││ │
│ │ Transportation   │ ₹2,000 │ ₹1,800 │ Per person    ││ │
│ │ Activity Package │ ₹1,500 │ ₹1,200 │ Per person    ││ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [💾 Save Pricing Period]                               │
└─────────────────────────────────────────────────────────┘
```

## 🔄 **Migration Strategy**

### **1. Database Migration**
```sql
-- Create LocationSeasonalPeriod table
CREATE TABLE LocationSeasonalPeriod (
  id VARCHAR(36) PRIMARY KEY,
  locationId VARCHAR(36) NOT NULL,
  seasonType VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  startMonth INT NOT NULL,
  startDay INT NOT NULL,
  endMonth INT NOT NULL,
  endDay INT NOT NULL,
  description TEXT,
  isActive BOOLEAN DEFAULT true,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_location (locationId),
  INDEX idx_season_type (seasonType),
  INDEX idx_period_start (startMonth, startDay),
  INDEX idx_period_end (endMonth, endDay)
);

-- Add foreign key to TourPackagePricing
ALTER TABLE TourPackagePricing 
ADD COLUMN locationSeasonalPeriodId VARCHAR(36),
ADD INDEX idx_seasonal_period (locationSeasonalPeriodId);
```

### **2. Seed Data Strategy**
```javascript
// Common seasonal period templates
const seasonalTemplates = {
  HILL_STATION: [
    { type: 'PEAK_SEASON', name: 'Summer Peak', start: [4, 1], end: [6, 30] },
    { type: 'OFF_SEASON', name: 'Monsoon Off', start: [7, 1], end: [9, 30] },
    { type: 'SHOULDER_SEASON', name: 'Winter Pleasant', start: [10, 1], end: [3, 31] }
  ],
  BEACH_DESTINATION: [
    { type: 'PEAK_SEASON', name: 'Winter Peak', start: [11, 1], end: [2, 28] },
    { type: 'OFF_SEASON', name: 'Monsoon Off', start: [6, 1], end: [9, 30] },
    { type: 'SHOULDER_SEASON', name: 'Pleasant Season', start: [3, 1], end: [5, 31] }
  ]
  // ... more templates
};
```

## 🎯 **Success Metrics**

1. **User Efficiency**: 70% reduction in pricing setup time
2. **Data Consistency**: 95% of pricing periods use predefined seasons
3. **Error Reduction**: 80% fewer date-related pricing conflicts
4. **User Adoption**: 90% of locations have defined seasonal periods
5. **Business Impact**: 15% improvement in pricing accuracy

This comprehensive design ensures a seamless, intuitive, and powerful location-based seasonal pricing system that scales with your business needs! 🚀
