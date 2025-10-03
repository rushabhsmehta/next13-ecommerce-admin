// Test script to verify hotel-destination linking functionality
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testHotelDestinationLinking() {
  try {
    console.log('🔍 Testing hotel-destination linking...');

    // Test 1: Fetch a hotel with destination relationship
    console.log('\n1. Testing hotel query with destination relationship...');
    const hotelsWithDestinations = await prisma.hotel.findMany({
      include: {
        location: true,
        destination: true,
        images: true,
      },
      take: 5,
    });

    console.log(`Found ${hotelsWithDestinations.length} hotels`);
    hotelsWithDestinations.forEach((hotel, index) => {
      console.log(`Hotel ${index + 1}:`);
      console.log(`  - Name: ${hotel.name}`);
      console.log(`  - Location: ${hotel.location.label}`);
      console.log(`  - Destination: ${hotel.destination?.name || 'None'}`);
    });

    // Test 2: Fetch destinations with their hotels
    console.log('\n2. Testing destination query with hotels relationship...');
    const destinationsWithHotels = await prisma.tourDestination.findMany({
      include: {
        location: true,
        hotels: {
          include: {
            images: true,
          },
        },
      },
      take: 5,
    });

    console.log(`Found ${destinationsWithHotels.length} destinations`);
    destinationsWithHotels.forEach((destination, index) => {
      console.log(`Destination ${index + 1}:`);
      console.log(`  - Name: ${destination.name}`);
      console.log(`  - Location: ${destination.location.label}`);
      console.log(`  - Hotels: ${destination.hotels.length}`);
      destination.hotels.forEach((hotel, hotelIndex) => {
        console.log(`    ${hotelIndex + 1}. ${hotel.name}`);
      });
    });

    // Test 3: Validate schema constraints
    console.log('\n3. Testing schema constraints...');
    
    // Test that hotel can exist without destination
    const hotelWithoutDestination = await prisma.hotel.findFirst({
      where: {
        destinationId: null,
      },
      include: {
        location: true,
        destination: true,
      },
    });

    if (hotelWithoutDestination) {
      console.log('✅ Hotels can exist without destinations');
      console.log(`  Example: ${hotelWithoutDestination.name} (${hotelWithoutDestination.location.label})`);
    }

    // Test that hotel can exist with destination
    const hotelWithDestination = await prisma.hotel.findFirst({
      where: {
        destinationId: {
          not: null,
        },
      },
      include: {
        location: true,
        destination: true,
      },
    });

    if (hotelWithDestination) {
      console.log('✅ Hotels can exist with destinations');
      console.log(`  Example: ${hotelWithDestination.name} -> ${hotelWithDestination.destination?.name}`);
    }

    console.log('\n✅ Hotel-destination linking test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testHotelDestinationLinking();
