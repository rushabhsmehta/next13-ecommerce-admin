// Check current state of variant hotel mappings
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function checkVariantMappings() {
  const tourPackageQueryId = '86769a56-ab13-49d3-b9ec-3c71d9cdf828';
  
  console.log('🔍 Checking variant hotel mappings state...\n');
  
  try {
    // Get package variants with mappings
    const variants = await prisma.packageVariant.findMany({
      where: { tourPackageQueryId },
      include: {
        variantHotelMappings: {
          include: {
            hotel: true,
            itinerary: {
              select: {
                id: true,
                dayNumber: true,
                itineraryTitle: true,
              }
            }
          }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });
    
    console.log(`📦 Found ${variants.length} package variants\n`);
    
    // Get current itineraries
    const itineraries = await prisma.itinerary.findMany({
      where: { tourPackageQueryId },
      select: {
        id: true,
        dayNumber: true,
        itineraryTitle: true,
      },
      orderBy: { dayNumber: 'asc' }
    });
    
    console.log(`📅 Current itineraries (${itineraries.length}):`);
    itineraries.forEach((itin, idx) => {
      console.log(`  ${idx + 1}. Day ${itin.dayNumber}: ${itin.itineraryTitle?.substring(0, 50)}... (ID: ${itin.id})`);
    });
    console.log('');
    
    variants.forEach((variant, idx) => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Variant ${idx + 1}: "${variant.name}"`);
      console.log(`${'='.repeat(60)}`);
      console.log(`Hotel Mappings: ${variant.variantHotelMappings.length}`);
      
      if (variant.variantHotelMappings.length === 0) {
        console.log('❌ NO HOTEL MAPPINGS - This is why hotels aren\'t showing!\n');
        console.log('💡 Solution: You need to re-assign hotels to each day in the Variants tab.');
      } else {
        console.log('\n📋 Mappings:');
        variant.variantHotelMappings.forEach((mapping, midx) => {
          console.log(`  ${midx + 1}. ${mapping.itinerary ? `Day ${mapping.itinerary.dayNumber}` : 'Unknown Day'}`);
          console.log(`     Hotel: ${mapping.hotel.name}`);
          console.log(`     Itinerary ID: ${mapping.itineraryId}`);
          console.log(`     Valid: ${mapping.itinerary ? '✅' : '❌ (Orphaned)'}`);
        });
      }
    });
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('\n📊 SUMMARY:');
    console.log(`   Total Itineraries: ${itineraries.length}`);
    console.log(`   Total Variants: ${variants.length}`);
    variants.forEach((v, idx) => {
      const assigned = v.variantHotelMappings.length;
      const total = itineraries.length;
      const isComplete = assigned === total;
      console.log(`   ${v.name}: ${assigned}/${total} hotels ${isComplete ? '✅' : '❌'}`);
    });
    
    if (variants.some(v => v.variantHotelMappings.length === 0)) {
      console.log('\n⚠️  ACTION REQUIRED:');
      console.log('   1. Open the tour package query in your browser');
      console.log('   2. Go to the "Variants" tab');
      console.log('   3. For each day, select a hotel from the dropdown');
      console.log('   4. Click "Save changes" at the bottom');
      console.log('\n   The UI shows "7/7 Hotels Assigned" because it\'s reading old cached data.');
      console.log('   After you reload the page, it should show "0/7 Hotels Assigned".');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkVariantMappings();
