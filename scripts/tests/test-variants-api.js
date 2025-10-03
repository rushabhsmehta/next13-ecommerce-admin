// Test script for Package Variants API
// Run with: node test-variants-api.js

const BASE_URL = 'http://localhost:3000/api';

async function testVariantsAPI() {
  console.log('🧪 Testing Package Variants API\n');

  try {
    // Test 1: Create a variant
    console.log('Test 1: Creating a variant...');
    const createResponse = await fetch(`${BASE_URL}/package-variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Luxury',
        description: 'Premium 5-star accommodations',
        tourPackageQueryId: 'your-tour-package-query-id', // Replace with actual ID
        isDefault: false,
        sortOrder: 0,
        priceModifier: 50,
      }),
    });
    const variant = await createResponse.json();
    console.log('✅ Variant created:', variant);
    const variantId = variant.id;

    // Test 2: Get all variants for a package
    console.log('\nTest 2: Getting all variants...');
    const getAllResponse = await fetch(
      `${BASE_URL}/package-variants?tourPackageQueryId=your-tour-package-query-id`
    );
    const allVariants = await getAllResponse.json();
    console.log('✅ All variants:', allVariants);

    // Test 3: Get specific variant
    console.log('\nTest 3: Getting specific variant...');
    const getOneResponse = await fetch(`${BASE_URL}/package-variants/${variantId}`);
    const oneVariant = await getOneResponse.json();
    console.log('✅ Single variant:', oneVariant);

    // Test 4: Update variant
    console.log('\nTest 4: Updating variant...');
    const updateResponse = await fetch(`${BASE_URL}/package-variants/${variantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Luxury Plus',
        description: 'Ultra premium accommodations',
        priceModifier: 75,
      }),
    });
    const updatedVariant = await updateResponse.json();
    console.log('✅ Variant updated:', updatedVariant);

    // Test 5: Create hotel mappings
    console.log('\nTest 5: Creating hotel mappings...');
    const mappingsResponse = await fetch(
      `${BASE_URL}/package-variants/${variantId}/hotel-mappings`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mappings: [
            { itineraryId: 'itinerary-1-id', hotelId: 'hotel-1-id' },
            { itineraryId: 'itinerary-2-id', hotelId: 'hotel-2-id' },
          ],
        }),
      }
    );
    const variantWithMappings = await mappingsResponse.json();
    console.log('✅ Hotel mappings created:', variantWithMappings);

    // Test 6: Get hotel mappings
    console.log('\nTest 6: Getting hotel mappings...');
    const getMappingsResponse = await fetch(
      `${BASE_URL}/package-variants/${variantId}/hotel-mappings`
    );
    const mappings = await getMappingsResponse.json();
    console.log('✅ Hotel mappings:', mappings);

    // Test 7: Delete variant
    console.log('\nTest 7: Deleting variant...');
    const deleteResponse = await fetch(`${BASE_URL}/package-variants/${variantId}`, {
      method: 'DELETE',
    });
    const deleteResult = await deleteResponse.json();
    console.log('✅ Variant deleted:', deleteResult);

    console.log('\n🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests
testVariantsAPI();
