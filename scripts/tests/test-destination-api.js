// Test script for Destination APIs
// Run this using: node test-destination-api.js

const BASE_URL = 'http://localhost:3000';

async function testDestinationAPIs() {
  console.log('🧪 Testing Destination APIs...\n');

  try {
    // Test 1: Get all destinations
    console.log('1. Testing GET /api/destinations');
    const allDestinations = await fetch(`${BASE_URL}/api/destinations`);
    const destinations = await allDestinations.json();
    console.log(`✅ Found ${destinations.length} destinations\n`);

    // Test 2: Get all locations (needed for destination creation)
    console.log('2. Testing GET /api/locations');
    const allLocations = await fetch(`${BASE_URL}/api/locations`);
    const locations = await allLocations.json();
    console.log(`✅ Found ${locations.length} locations\n`);

    if (locations.length === 0) {
      console.log('❌ No locations found. Create a location first.');
      return;
    }

    // Test 3: Create a new destination
    console.log('3. Testing POST /api/destinations');
    const newDestination = {
      name: 'Test Destination - Srinagar',
      description: 'Beautiful summer capital of Kashmir',
      imageUrl: 'https://example.com/srinagar.jpg',
      locationId: locations[0].id, // Use first location
      isActive: true
    };

    const createResponse = await fetch(`${BASE_URL}/api/destinations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newDestination)
    });

    if (createResponse.ok) {
      const createdDestination = await createResponse.json();
      console.log(`✅ Created destination: ${createdDestination.name}`);
      console.log(`   ID: ${createdDestination.id}\n`);

      // Test 4: Get specific destination
      console.log('4. Testing GET /api/destinations/[id]');
      const getResponse = await fetch(`${BASE_URL}/api/destinations/${createdDestination.id}`);
      const fetchedDestination = await getResponse.json();
      console.log(`✅ Fetched destination: ${fetchedDestination.name}\n`);

      // Test 5: Update destination
      console.log('5. Testing PATCH /api/destinations/[id]');
      const updateData = {
        ...newDestination,
        name: 'Updated Test Destination - Srinagar',
        description: 'Updated description for the beautiful summer capital'
      };

      const updateResponse = await fetch(`${BASE_URL}/api/destinations/${createdDestination.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      if (updateResponse.ok) {
        const updatedDestination = await updateResponse.json();
        console.log(`✅ Updated destination: ${updatedDestination.name}\n`);
      } else {
        console.log('❌ Failed to update destination\n');
      }

      // Test 6: Get destinations filtered by location
      console.log('6. Testing GET /api/destinations?locationId=...');
      const filteredResponse = await fetch(`${BASE_URL}/api/destinations?locationId=${locations[0].id}`);
      const filteredDestinations = await filteredResponse.json();
      console.log(`✅ Found ${filteredDestinations.length} destinations for location\n`);

      // Test 7: Delete destination (cleanup)
      console.log('7. Testing DELETE /api/destinations/[id]');
      const deleteResponse = await fetch(`${BASE_URL}/api/destinations/${createdDestination.id}`, {
        method: 'DELETE'
      });

      if (deleteResponse.ok) {
        console.log('✅ Successfully deleted test destination\n');
      } else {
        console.log('❌ Failed to delete destination\n');
      }

    } else {
      const error = await createResponse.text();
      console.log(`❌ Failed to create destination: ${error}\n`);
    }

    console.log('🎉 All Destination API tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Export for module usage or run directly
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testDestinationAPIs };
} else {
  testDestinationAPIs();
}
