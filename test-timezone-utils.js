/**
 * Test file to verify timezone utilities are working correctly
 * This can be run to validate the UTC problem fixes
 */

import { 
  dateToUtc, 
  utcToLocal, 
  formatLocalDate, 
  convertJourneyDateToTourStart,
  normalizeApiDate,
  createDatePickerValue 
} from '../lib/timezone-utils';

console.log('🧪 Testing Timezone Utilities...\n');

// Test 1: Date conversion consistency
console.log('📅 Test 1: Date Conversion Consistency');
const testDate = new Date('2025-06-15'); // June 15, 2025
console.log('Original Date:', testDate.toISOString());

const utcDate = dateToUtc(testDate);
console.log('Converted to UTC:', utcDate?.toISOString());

const backToLocal = utcToLocal(utcDate);
console.log('Back to Local:', backToLocal?.toISOString());

// Test 2: Journey date to tour start conversion
console.log('\n🎯 Test 2: Journey Date to Tour Start Conversion');
const journeyDate = '2025-06-20T00:00:00.000Z'; // UTC date from database
console.log('Journey Date (UTC):', journeyDate);

const tourStartDate = convertJourneyDateToTourStart(journeyDate);
console.log('Tour Start Date:', tourStartDate?.toISOString());

// Test 3: API date normalization
console.log('\n🔄 Test 3: API Date Normalization');
const localPickedDate = new Date('2025-06-25'); // Date picked in UI
console.log('Locally Picked Date:', localPickedDate.toISOString());

const normalizedDate = normalizeApiDate(localPickedDate);
console.log('Normalized for API:', normalizedDate);

// Test 4: Date picker value creation
console.log('\n🖱️ Test 4: Date Picker Value Creation');
const dbDateString = '2025-06-30T18:30:00.000Z'; // UTC date from database
console.log('Database Date (UTC):', dbDateString);

const pickerValue = createDatePickerValue(dbDateString);
console.log('Date Picker Value:', pickerValue?.toISOString());

// Test 5: Date formatting
console.log('\n📝 Test 5: Date Formatting');
const dateToFormat = '2025-07-01T12:00:00.000Z';
console.log('Date to Format (UTC):', dateToFormat);

const formattedDate = formatLocalDate(dateToFormat, 'PPP');
console.log('Formatted for Display:', formattedDate);

const formattedShort = formatLocalDate(dateToFormat, 'dd-MM-yyyy');
console.log('Short Format:', formattedShort);

console.log('\n✅ Timezone utility tests completed!');
console.log('📋 Summary:');
console.log('- All dates should maintain their intended calendar date');
console.log('- UTC conversion should preserve local date meaning');
console.log('- Display formatting should show dates in user timezone');
console.log('- API normalization should handle timezone offsets correctly');
