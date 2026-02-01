/**
 * Test AI Wizard Draft Data Mapping
 * 
 * This script tests the data mapping logic from AI-generated itinerary
 * to the tour package query form format.
 */

console.log('🧪 Testing AI Wizard Draft Data Mapping\n');

// Simulate AI-generated data structure
const aiGeneratedData = {
  tourPackageName: "Magical Bali Escape",
  tourCategory: "International",
  tourPackageType: "Honeymoon",
  numDaysNight: "5 Nights / 6 Days",
  transport: "Private Car",
  pickup_location: "Denpasar Airport",
  drop_location: "Denpasar Airport",
  highlights: ["Ubud Rice Terraces", "Beach Resorts", "Temple Tours"],
  customerName: "John Doe",
  tourStartsFrom: "2024-03-15",
  numAdults: 2,
  numChildren: 1,
  itineraries: [
    {
      dayNumber: 1,
      itineraryTitle: "Arrival at Bali",
      itineraryDescription: "Arrive at Denpasar Airport and transfer to Ubud hotel.",
      mealsIncluded: "Dinner",
      suggestedHotel: "Ubud Palace Resort",
      activities: [
        {
          activityTitle: "",
          activityDescription: "i. Arrival at Denpasar Airport and transfer to Ubud hotel.\nii. Visit Tegalalang Rice Terraces and enjoy the scenery.\niii. Explore Tirta Empul Temple and witness the holy spring."
        }
      ]
    },
    {
      dayNumber: 2,
      itineraryTitle: "Beach Day at Seminyak",
      itineraryDescription: "Relax on the beautiful beaches of Seminyak.",
      mealsIncluded: "Breakfast, Lunch",
      suggestedHotel: "Seminyak Beach Resort",
      activities: [
        {
          activityTitle: "",
          activityDescription: "i. Morning beach yoga session.\nii. Water sports activities.\niii. Sunset dinner at beach club."
        }
      ]
    }
  ]
};

// Simulate the mapping logic from tourPackageQuery-form.tsx
function mapAIDataToFormValues(data, locationId = "location123") {
  const mappedData = {
    tourPackageQueryName: data.tourPackageName || data.tourPackageQueryName || '',
    customerName: data.customerName || '',
    tourCategory: data.tourCategory || 'Domestic',
    numDaysNight: data.numDaysNight || '',
    transport: data.transport || '',
    pickup_location: data.pickup_location || '',
    drop_location: data.drop_location || '',
    locationId: locationId,
    numAdults: String(data.numAdults || ''),
    numChild5to12: String(data.numChildren || data.numChild5to12 || ''),
    tourStartsFrom: data.tourStartsFrom ? new Date(data.tourStartsFrom) : undefined,

    // Map Itineraries with activities
    itineraries: Array.isArray(data.itineraries) ? data.itineraries.map((day) => ({
      dayNumber: day.dayNumber,
      itineraryTitle: day.itineraryTitle || '',
      itineraryDescription: day.itineraryDescription || '',
      mealsIncluded: day.mealsIncluded ? day.mealsIncluded.split(',') : [],

      // Handle activities from AI generation
      activities: Array.isArray(day.activities) && day.activities.length > 0 
        ? (() => {
            const firstActivity = day.activities[0];
            if (typeof firstActivity === 'object' && firstActivity.activityDescription) {
              // AI-generated format: convert \n to <br> for HTML display
              const descriptionWithLineBreaks = firstActivity.activityDescription.replace(/\n/g, '<br>');
              
              return [{
                activityTitle: firstActivity.activityTitle || '',
                activityDescription: descriptionWithLineBreaks,
                activityImages: []
              }];
            } else if (typeof firstActivity === 'string') {
              // Legacy format
              return day.activities.map((act) => ({
                activityTitle: act,
                activityDescription: '',
                activityImages: []
              }));
            } else {
              return [];
            }
          })()
        : [],
      itineraryImages: [],
      hotelId: '',
      locationId: locationId,
      roomAllocations: [],
      transportDetails: []
    })) : [],
  };

  return mappedData;
}

// Test the mapping
const result = mapAIDataToFormValues(aiGeneratedData);

console.log('✅ Basic Fields Mapping:');
console.log(`  Tour Name: ${result.tourPackageQueryName}`);
console.log(`  Customer: ${result.customerName}`);
console.log(`  Category: ${result.tourCategory}`);
console.log(`  Duration: ${result.numDaysNight}`);
console.log(`  Transport: ${result.transport}`);
console.log(`  Adults: ${result.numAdults}`);
console.log(`  Children: ${result.numChild5to12}`);
console.log('');

console.log('✅ Itineraries Mapping:');
console.log(`  Number of days: ${result.itineraries.length}`);
result.itineraries.forEach((itinerary, index) => {
  console.log(`\n  Day ${itinerary.dayNumber}:`);
  console.log(`    Title: ${itinerary.itineraryTitle}`);
  console.log(`    Description: ${itinerary.itineraryDescription}`);
  console.log(`    Meals: ${itinerary.mealsIncluded.join(', ')}`);
  console.log(`    Activities count: ${itinerary.activities.length}`);
  
  if (itinerary.activities.length > 0) {
    const activity = itinerary.activities[0];
    console.log(`    Activity Title: "${activity.activityTitle}"`);
    console.log(`    Activity Description (with <br> tags):`);
    console.log(`      ${activity.activityDescription}`);
    
    // Verify line breaks are converted
    const hasLineBreaks = activity.activityDescription.includes('<br>');
    console.log(`    ✓ Line breaks converted: ${hasLineBreaks ? '✅ YES' : '❌ NO'}`);
    
    // Count roman numerals
    const romanCount = (activity.activityDescription.match(/[i]{1,3}\./g) || []).length;
    console.log(`    ✓ Roman numerals found: ${romanCount}`);
  }
});

console.log('\n');
console.log('🎉 Test Complete!');
console.log('\nExpected behavior:');
console.log('  1. ✅ Basic fields should be mapped correctly');
console.log('  2. ✅ Activities should be in a single activity object');
console.log('  3. ✅ Activity description should contain <br> tags instead of \\n');
console.log('  4. ✅ Roman numerals (i., ii., iii.) should be preserved');
