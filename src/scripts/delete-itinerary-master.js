// This script deletes all records from the ItineraryMaster table
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAllItineraryMasters() {
  try {
    // First delete all activities associated with itineraries to prevent foreign key constraints
    console.log('Deleting activities associated with ItineraryMasters...');
    await prisma.activity.deleteMany({
      where: {
        itineraryMasterId: {
          not: null
        }
      }
    });

    // Then delete all itinerary master images
    console.log('Deleting itineraryMasterImages...');
    await prisma.images.deleteMany({
      where: {
        itinerariesMasterId: {
          not: null
        }
      }
    });

    // Finally delete all itinerary masters
    console.log('Deleting ItineraryMasters...');
    const result = await prisma.itineraryMaster.deleteMany({});
    
    console.log(`Successfully deleted ${result.count} ItineraryMaster records`);
    return result.count;
  } catch (error) {
    console.error('Error deleting ItineraryMaster records:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllItineraryMasters()
  .then((count) => {
    console.log(`Operation completed. ${count} records deleted.`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to delete records:', error);
    process.exit(1);
  });