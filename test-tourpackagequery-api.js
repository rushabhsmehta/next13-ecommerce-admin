// Quick test to diagnose the API error
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function testTourPackageQueryAPI() {
  const tourPackageQueryId = '86769a56-ab13-49d3-b9ec-3c71d9cdf828';
  
  console.log('🔍 Testing TourPackageQuery API...');
  console.log('📌 ID:', tourPackageQueryId);
  
  try {
    // Test 1: Check if the record exists
    console.log('\n✅ Test 1: Checking if record exists...');
    const exists = await prisma.tourPackageQuery.findUnique({
      where: { id: tourPackageQueryId },
      select: { id: true, tourPackageQueryName: true }
    });
    
    if (!exists) {
      console.log('❌ Record not found!');
      return;
    }
    
    console.log('✅ Record found:', exists);
    
    // Test 2: Try to fetch with all relations
    console.log('\n✅ Test 2: Fetching with all relations...');
    const fullData = await prisma.tourPackageQuery.findUnique({
      where: { id: tourPackageQueryId },
      include: {
        associatePartner: true,
        flightDetails: {
          include: {
            images: true,
          }
        },
        images: true,
        location: true,
        itineraries: {
          include: {
            itineraryImages: true,
            roomAllocations: true,
            transportDetails: true,
            activities: {
              include: {
                activityImages: true,
              }
            }
          },
          orderBy: [
            { dayNumber: 'asc' },
            { days: 'asc' }
          ]
        },
        packageVariants: {
          include: {
            variantHotelMappings: {
              include: {
                hotel: {
                  include: {
                    images: true,
                  },
                },
                itinerary: true,
              },
            },
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      }
    });
    
    console.log('✅ Data fetched successfully!');
    console.log('📊 Summary:');
    console.log('  - Name:', fullData.tourPackageQueryName);
    console.log('  - Itineraries:', fullData.itineraries?.length || 0);
    console.log('  - Package Variants:', fullData.packageVariants?.length || 0);
    console.log('  - Flight Details:', fullData.flightDetails?.length || 0);
    console.log('  - Images:', fullData.images?.length || 0);
    
    if (fullData.packageVariants && fullData.packageVariants.length > 0) {
      console.log('\n📦 Package Variants Details:');
      fullData.packageVariants.forEach((variant, index) => {
        console.log(`  ${index + 1}. ${variant.name}`);
        console.log(`     - Hotel Mappings: ${variant.variantHotelMappings?.length || 0}`);
      });
    }
    
    console.log('\n✅ All tests passed! The API should work.');
    
  } catch (error) {
    console.error('\n❌ Error occurred:', error.message);
    console.error('Full error:', error);
    
    // Check specific error codes
    if (error.code === 'P2025') {
      console.log('\n💡 Suggestion: The record might have been deleted.');
    } else if (error.code === 'P2021') {
      console.log('\n💡 Suggestion: Table does not exist in database. Run: npx prisma db push');
    } else if (error.message.includes('connect')) {
      console.log('\n💡 Suggestion: Database connection issue. Check your .env DATABASE_URL');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testTourPackageQueryAPI();
