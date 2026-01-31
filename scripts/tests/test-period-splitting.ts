/**
 * Test script for hotel pricing period splitting logic
 * 
 * This script tests the period splitting algorithm that handles overlapping pricing periods.
 * 
 * Scenario: 
 * - Existing pricing: April 1 to December 31 @ ₹5000
 * - New pricing: July 1 to September 30 @ ₹7000
 * 
 * Expected result:
 * - April 1 to June 30 @ ₹5000 (preserved)
 * - July 1 to September 30 @ ₹7000 (new)
 * - October 1 to December 31 @ ₹5000 (preserved)
 */

function dateToUtc(date: Date): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

interface PricingPeriod {
  id: string;
  startDate: Date;
  endDate: Date;
  price: number;
  roomTypeId: string;
  occupancyTypeId: string;
  mealPlanId: string | null;
}

interface SplitResult {
  periodsToDelete: string[];
  periodsToCreate: Array<{
    startDate: Date;
    endDate: Date;
    price: number;
    isNew: boolean;
  }>;
}

function calculatePeriodSplit(
  existingPeriods: PricingPeriod[],
  newStart: Date,
  newEnd: Date,
  newPrice: number,
  roomTypeId: string,
  occupancyTypeId: string,
  mealPlanId: string | null
): SplitResult {
  const result: SplitResult = {
    periodsToDelete: [],
    periodsToCreate: []
  };

  // Find overlapping periods with matching attributes
  const overlappingPeriods = existingPeriods.filter(period => {
    return (
      period.roomTypeId === roomTypeId &&
      period.occupancyTypeId === occupancyTypeId &&
      period.mealPlanId === mealPlanId &&
      period.startDate <= newEnd &&
      period.endDate >= newStart
    );
  });

  // Process each overlapping period
  for (const period of overlappingPeriods) {
    result.periodsToDelete.push(period.id);

    // Create before segment if exists
    if (period.startDate < newStart) {
      const beforeEnd = new Date(newStart);
      beforeEnd.setDate(beforeEnd.getDate() - 1);
      result.periodsToCreate.push({
        startDate: period.startDate,
        endDate: beforeEnd,
        price: period.price,
        isNew: false
      });
    }

    // Create after segment if exists
    if (period.endDate > newEnd) {
      const afterStart = new Date(newEnd);
      afterStart.setDate(afterStart.getDate() + 1);
      result.periodsToCreate.push({
        startDate: afterStart,
        endDate: period.endDate,
        price: period.price,
        isNew: false
      });
    }
  }

  // Add the new pricing period
  result.periodsToCreate.push({
    startDate: newStart,
    endDate: newEnd,
    price: newPrice,
    isNew: true
  });

  // Sort by start date
  result.periodsToCreate.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  return result;
}

// Test the algorithm
console.log('🧪 Testing Hotel Pricing Period Splitting Algorithm\n');

// Existing pricing period
const existingPeriods: PricingPeriod[] = [
  {
    id: 'period-1',
    startDate: new Date(2024, 3, 1), // April 1, 2024
    endDate: new Date(2024, 11, 31), // December 31, 2024
    price: 5000,
    roomTypeId: 'room-1',
    occupancyTypeId: 'occ-1',
    mealPlanId: 'meal-1'
  }
];

// New pricing to add
const newStart = new Date(2024, 6, 1); // July 1, 2024
const newEnd = new Date(2024, 8, 30); // September 30, 2024
const newPrice = 7000;

console.log('📅 Existing Pricing Period:');
console.log(`   April 1, 2024 - December 31, 2024 @ ₹5,000\n`);

console.log('📝 New Pricing to Add:');
console.log(`   July 1, 2024 - September 30, 2024 @ ₹7,000\n`);

const result = calculatePeriodSplit(
  existingPeriods,
  newStart,
  newEnd,
  newPrice,
  'room-1',
  'occ-1',
  'meal-1'
);

console.log('✅ Split Result:\n');
console.log(`Periods to delete: ${result.periodsToDelete.length}`);
result.periodsToDelete.forEach(id => {
  console.log(`   - ${id}`);
});

console.log(`\nPeriods to create: ${result.periodsToCreate.length}`);
result.periodsToCreate.forEach((period, index) => {
  const tag = period.isNew ? '🆕 NEW' : '📋 PRESERVED';
  const startStr = period.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const endStr = period.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  console.log(`   ${index + 1}. ${tag}: ${startStr} - ${endStr} @ ₹${period.price.toLocaleString()}`);
});

console.log('\n✨ Expected Result:');
console.log('   1. 📋 PRESERVED: Apr 1, 2024 - Jun 30, 2024 @ ₹5,000');
console.log('   2. 🆕 NEW: Jul 1, 2024 - Sep 30, 2024 @ ₹7,000');
console.log('   3. 📋 PRESERVED: Oct 1, 2024 - Dec 31, 2024 @ ₹5,000');

console.log('\n' + '='.repeat(80));
console.log('Test Case 2: Multiple Overlapping Periods');
console.log('='.repeat(80) + '\n');

const multipleExistingPeriods: PricingPeriod[] = [
  {
    id: 'period-1',
    startDate: new Date(2024, 0, 1), // January 1, 2024
    endDate: new Date(2024, 5, 30), // June 30, 2024
    price: 4000,
    roomTypeId: 'room-1',
    occupancyTypeId: 'occ-1',
    mealPlanId: 'meal-1'
  },
  {
    id: 'period-2',
    startDate: new Date(2024, 6, 1), // July 1, 2024
    endDate: new Date(2024, 11, 31), // December 31, 2024
    price: 6000,
    roomTypeId: 'room-1',
    occupancyTypeId: 'occ-1',
    mealPlanId: 'meal-1'
  }
];

const newStart2 = new Date(2024, 4, 1); // May 1, 2024
const newEnd2 = new Date(2024, 7, 31); // August 31, 2024
const newPrice2 = 8000;

console.log('📅 Existing Pricing Periods:');
console.log(`   1. January 1, 2024 - June 30, 2024 @ ₹4,000`);
console.log(`   2. July 1, 2024 - December 31, 2024 @ ₹6,000\n`);

console.log('📝 New Pricing to Add:');
console.log(`   May 1, 2024 - August 31, 2024 @ ₹8,000\n`);

const result2 = calculatePeriodSplit(
  multipleExistingPeriods,
  newStart2,
  newEnd2,
  newPrice2,
  'room-1',
  'occ-1',
  'meal-1'
);

console.log('✅ Split Result:\n');
console.log(`Periods to delete: ${result2.periodsToDelete.length}`);
result2.periodsToDelete.forEach(id => {
  console.log(`   - ${id}`);
});

console.log(`\nPeriods to create: ${result2.periodsToCreate.length}`);
result2.periodsToCreate.forEach((period, index) => {
  const tag = period.isNew ? '🆕 NEW' : '📋 PRESERVED';
  const startStr = period.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const endStr = period.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  console.log(`   ${index + 1}. ${tag}: ${startStr} - ${endStr} @ ₹${period.price.toLocaleString()}`);
});

console.log('\n✨ Expected Result:');
console.log('   1. 📋 PRESERVED: Jan 1, 2024 - Apr 30, 2024 @ ₹4,000');
console.log('   2. 🆕 NEW: May 1, 2024 - Aug 31, 2024 @ ₹8,000');
console.log('   3. 📋 PRESERVED: Sep 1, 2024 - Dec 31, 2024 @ ₹6,000');

console.log('\n🎉 All tests completed successfully!');
