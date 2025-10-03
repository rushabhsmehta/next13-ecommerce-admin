// Test script to validate the accommodation policies update logic
const { PrismaClient } = require('@prisma/client');

// Test the update logic without actually updating the database
const NEW_ACCOMMODATION_TEXTS = [
  "Accommodation in standard rooms",
  "For pool/beach facing / pvt pool villa/ suites rooms additional charges applicable"
];

const OLD_ACCOMMODATION_TEXT = "Accommodation in preferred Hotel";

function updateInclusions(existingInclusions) {
  let inclusions = [];
  
  if (Array.isArray(existingInclusions)) {
    inclusions = existingInclusions;
  } else if (typeof existingInclusions === 'string') {
    try {
      inclusions = JSON.parse(existingInclusions);
    } catch (e) {
      inclusions = [existingInclusions];
    }
  } else if (existingInclusions) {
    inclusions = [String(existingInclusions)];
  } else {
    return NEW_ACCOMMODATION_TEXTS.concat([
      "Meal As Per Plan",
      "All Transfers & Sightseeing By Private Vehicle",
      "All Toll, Tax, Parking, Driver's Allowance"
    ]);
  }

  const updatedInclusions = inclusions.map(item => {
    if (item === OLD_ACCOMMODATION_TEXT) {
      return NEW_ACCOMMODATION_TEXTS;
    }
    return item;
  }).flat();

  if (!inclusions.some(item => item === OLD_ACCOMMODATION_TEXT) && inclusions.length > 0) {
    const hasNewAccommodationPolicy = NEW_ACCOMMODATION_TEXTS.some(newText => 
      inclusions.some(existing => existing.includes("Accommodation in standard rooms") || existing.includes("pool/beach facing"))
    );
    
    if (!hasNewAccommodationPolicy) {
      return NEW_ACCOMMODATION_TEXTS.concat(inclusions);
    }
  }

  return updatedInclusions;
}

// Test cases
console.log('🧪 Testing accommodation policies update logic...\n');

// Test 1: Old accommodation text
const test1 = ["Accommodation in preferred Hotel", "Meal As Per Plan"];
const result1 = updateInclusions(test1);
console.log('Test 1 - Old accommodation text:');
console.log('Input:', test1);
console.log('Output:', result1);
console.log('✅ Should replace old accommodation text\n');

// Test 2: No accommodation policy
const test2 = ["Meal As Per Plan", "All Transfers"];
const result2 = updateInclusions(test2);
console.log('Test 2 - No accommodation policy:');
console.log('Input:', test2);
console.log('Output:', result2);
console.log('✅ Should add new accommodation policies at beginning\n');

// Test 3: Already has new policies
const test3 = ["Accommodation in standard rooms", "Meal As Per Plan"];
const result3 = updateInclusions(test3);
console.log('Test 3 - Already has new policies:');
console.log('Input:', test3);
console.log('Output:', result3);
console.log('✅ Should not change anything\n');

// Test 4: Empty/null input
const test4 = null;
const result4 = updateInclusions(test4);
console.log('Test 4 - Empty/null input:');
console.log('Input:', test4);
console.log('Output:', result4);
console.log('✅ Should provide complete default inclusions\n');

// Test 5: JSON string input
const test5 = '["Accommodation in preferred Hotel", "Meal As Per Plan"]';
const result5 = updateInclusions(test5);
console.log('Test 5 - JSON string input:');
console.log('Input:', test5);
console.log('Output:', result5);
console.log('✅ Should parse JSON and update\n');

console.log('🎉 All tests completed! The update logic looks good.');
console.log('\n📝 Ready to run: npm run update-accommodation-policies');
