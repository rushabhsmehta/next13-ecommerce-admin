// Fix orphaned variant hotel mappings
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function cleanupOrphanedMappings() {
  const tourPackageQueryId = '86769a56-ab13-49d3-b9ec-3c71d9cdf828';
  
  console.log('🔧 Cleaning up orphaned variant hotel mappings...\n');
  
  try {
    // Step 1: Get all package variants for this tour package query
    const variants = await prisma.packageVariant.findMany({
      where: { tourPackageQueryId },
      include: {
        variantHotelMappings: true,
      },
    });
    
    console.log(`📦 Found ${variants.length} package variants`);
    
    // Step 2: Get all valid itinerary IDs for this tour package query
    const validItineraries = await prisma.itinerary.findMany({
      where: { tourPackageQueryId },
      select: { id: true, dayNumber: true, itineraryTitle: true },
    });
    
    const validItineraryIds = new Set(validItineraries.map(i => i.id));
    console.log(`✅ Found ${validItineraryIds.size} valid itineraries\n`);
    
    // Step 3: Find and delete orphaned mappings
    let totalOrphaned = 0;
    
    for (const variant of variants) {
      console.log(`🔍 Checking variant: "${variant.name}"`);
      console.log(`   Mappings: ${variant.variantHotelMappings.length}`);
      
      const orphanedMappings = variant.variantHotelMappings.filter(
        mapping => !validItineraryIds.has(mapping.itineraryId)
      );
      
      if (orphanedMappings.length > 0) {
        console.log(`   ❌ Found ${orphanedMappings.length} orphaned mappings`);
        
        for (const orphan of orphanedMappings) {
          console.log(`      - Deleting mapping with itineraryId: ${orphan.itineraryId}`);
          await prisma.variantHotelMapping.delete({
            where: { id: orphan.id },
          });
        }
        
        totalOrphaned += orphanedMappings.length;
      } else {
        console.log(`   ✅ No orphaned mappings`);
      }
      
      console.log('');
    }
    
    console.log(`\n✅ Cleanup complete!`);
    console.log(`   Total orphaned mappings deleted: ${totalOrphaned}`);
    
    if (totalOrphaned > 0) {
      console.log('\n🎉 The API should now work! Try accessing it again.');
    } else {
      console.log('\n🤔 No orphaned mappings found. The issue might be elsewhere.');
    }
    
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupOrphanedMappings();
