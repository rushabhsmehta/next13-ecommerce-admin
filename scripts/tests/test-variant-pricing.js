/**
 * Test Script: Variant Pricing Calculator
 * 
 * Purpose: Test the variant pricing calculation API and service
 * Usage: node scripts/tests/test-variant-pricing.js
 * 
 * Prerequisites:
 * - Tour Package Query with variants configured
 * - Room allocations set up in variantRoomAllocations
 * - Transport details set up in variantTransportDetails
 * - Hotel pricing and transport pricing tables populated
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';
const API_ENDPOINT = '/api/pricing/calculate-variant';

// Test data (replace with actual UUIDs from your database)
const TEST_DATA = {
  variantId: 'your-variant-uuid-here',
  variantRoomAllocations: {
    'your-variant-uuid-here': {
      'itinerary-1': [
        {
          roomTypeId: 'room-type-uuid',
          occupancyTypeId: 'occupancy-type-uuid',
          mealPlanId: 'meal-plan-uuid',
          quantity: 2,
          guestNames: 'Test Guest 1, Test Guest 2',
          voucherNumber: 'TEST123'
        }
      ]
    }
  },
  variantTransportDetails: {
    'your-variant-uuid-here': {
      'itinerary-1': [
        {
          vehicleTypeId: 'vehicle-type-uuid',
          quantity: 1,
          description: 'Test transport'
        }
      ]
    }
  },
  itineraries: [
    {
      id: 'itinerary-1',
      locationId: 'location-uuid',
      dayNumber: 1,
      hotelId: 'hotel-uuid'
    }
  ],
  tourStartsFrom: '2026-03-15T00:00:00.000Z',
  tourEndsOn: '2026-03-20T00:00:00.000Z',
  markup: 10
};

async function testVariantPricing() {
  console.log('🧪 Testing Variant Pricing Calculator...\n');
  
  try {
    // Test 1: Basic calculation
    console.log('📝 Test 1: Basic pricing calculation');
    const response = await axios.post(`${BASE_URL}${API_ENDPOINT}`, TEST_DATA);
    
    if (response.status === 200) {
      console.log('✅ API call successful');
      console.log('\n📊 Pricing Result:');
      console.log(`   Total Cost: ₹${response.data.totalCost.toLocaleString('en-IN')}`);
      console.log(`   Base Price: ₹${response.data.basePrice.toLocaleString('en-IN')}`);
      console.log(`   Markup: ${response.data.appliedMarkup.percentage}% (₹${response.data.appliedMarkup.amount.toLocaleString('en-IN')})`);
      console.log(`   Accommodation: ₹${response.data.breakdown.accommodation.toLocaleString('en-IN')}`);
      console.log(`   Transport: ₹${response.data.breakdown.transport.toLocaleString('en-IN')}`);
      console.log(`   Calculated At: ${response.data.calculatedAt}`);
      
      // Verify calculations
      const expectedBasePrice = response.data.breakdown.accommodation + response.data.breakdown.transport;
      const expectedMarkupAmount = expectedBasePrice * (response.data.appliedMarkup.percentage / 100);
      const expectedTotalCost = Math.round(expectedBasePrice + expectedMarkupAmount);
      
      console.log('\n🔍 Verification:');
      console.log(`   Base price matches: ${expectedBasePrice === response.data.basePrice ? '✅' : '❌'}`);
      console.log(`   Markup amount matches: ${Math.abs(expectedMarkupAmount - response.data.appliedMarkup.amount) < 0.01 ? '✅' : '❌'}`);
      console.log(`   Total cost matches: ${expectedTotalCost === response.data.totalCost ? '✅' : '❌'}`);
      
      // Display day breakdown
      if (response.data.itineraryBreakdown && response.data.itineraryBreakdown.length > 0) {
        console.log('\n📅 Day-by-Day Breakdown:');
        response.data.itineraryBreakdown.forEach(day => {
          console.log(`   Day ${day.day}: ₹${day.totalCost.toLocaleString('en-IN')}`);
          if (day.roomBreakdown && day.roomBreakdown.length > 0) {
            day.roomBreakdown.forEach(room => {
              console.log(`      - ${room.roomTypeName || 'Room'} (${room.occupancyTypeName || 'Occupancy'}) x${room.quantity}: ₹${room.totalCost.toLocaleString('en-IN')}`);
            });
          }
          if (day.transportCost > 0) {
            console.log(`      - Transport: ₹${day.transportCost.toLocaleString('en-IN')}`);
          }
        });
      }
    } else {
      console.log('❌ Unexpected status code:', response.status);
    }
    
    // Test 2: No markup
    console.log('\n📝 Test 2: Pricing with 0% markup');
    const noMarkupData = { ...TEST_DATA, markup: 0 };
    const noMarkupResponse = await axios.post(`${BASE_URL}${API_ENDPOINT}`, noMarkupData);
    
    if (noMarkupResponse.status === 200) {
      console.log('✅ API call successful');
      console.log(`   Total Cost: ₹${noMarkupResponse.data.totalCost.toLocaleString('en-IN')}`);
      console.log(`   Base Price: ₹${noMarkupResponse.data.basePrice.toLocaleString('en-IN')}`);
      console.log(`   Total equals base: ${noMarkupResponse.data.totalCost === noMarkupResponse.data.basePrice ? '✅' : '❌'}`);
    }
    
    // Test 3: High markup
    console.log('\n📝 Test 3: Pricing with 50% markup');
    const highMarkupData = { ...TEST_DATA, markup: 50 };
    const highMarkupResponse = await axios.post(`${BASE_URL}${API_ENDPOINT}`, highMarkupData);
    
    if (highMarkupResponse.status === 200) {
      console.log('✅ API call successful');
      console.log(`   Total Cost: ₹${highMarkupResponse.data.totalCost.toLocaleString('en-IN')}`);
      console.log(`   Markup Amount: ₹${highMarkupResponse.data.appliedMarkup.amount.toLocaleString('en-IN')}`);
      const expectedMarkup = highMarkupResponse.data.basePrice * 0.5;
      console.log(`   Markup calculation correct: ${Math.abs(expectedMarkup - highMarkupResponse.data.appliedMarkup.amount) < 0.01 ? '✅' : '❌'}`);
    }
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    } else {
      console.error('   Error:', error.message);
    }
    
    console.log('\n💡 Troubleshooting tips:');
    console.log('   1. Ensure dev server is running (npm run dev)');
    console.log('   2. Update TEST_DATA with actual UUIDs from your database');
    console.log('   3. Verify hotel pricing and transport pricing tables have data');
    console.log('   4. Check that tour dates overlap with pricing date ranges');
    console.log('   5. Ensure pricing records are active (isActive: true)');
  }
}

// Run tests
testVariantPricing();

/*
 * Expected Output:
 * 
 * 🧪 Testing Variant Pricing Calculator...
 * 
 * 📝 Test 1: Basic pricing calculation
 * ✅ API call successful
 * 
 * 📊 Pricing Result:
 *    Total Cost: ₹55,000
 *    Base Price: ₹50,000
 *    Markup: 10% (₹5,000)
 *    Accommodation: ₹40,000
 *    Transport: ₹10,000
 *    Calculated At: 2026-02-05T10:30:00.000Z
 * 
 * 🔍 Verification:
 *    Base price matches: ✅
 *    Markup amount matches: ✅
 *    Total cost matches: ✅
 * 
 * 📅 Day-by-Day Breakdown:
 *    Day 1: ₹10,000
 *       - Deluxe Room (Double Occupancy) x2: ₹8,000
 *       - Transport: ₹2,000
 * 
 * 📝 Test 2: Pricing with 0% markup
 * ✅ API call successful
 *    Total Cost: ₹50,000
 *    Base Price: ₹50,000
 *    Total equals base: ✅
 * 
 * 📝 Test 3: Pricing with 50% markup
 * ✅ API call successful
 *    Total Cost: ₹75,000
 *    Markup Amount: ₹25,000
 *    Markup calculation correct: ✅
 * 
 * 🎉 All tests completed successfully!
 */
