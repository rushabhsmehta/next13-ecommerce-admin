// Script to update existing accommodation policies across all modules
// Run this script to update all existing locations, tour packages, and tour package queries
// with the new accommodation policies

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// New accommodation policies
const NEW_INCLUSIONS = [
  "Accommodation in standard rooms",
  "For pool/beach facing / pvt pool villa/ suites rooms additional charges applicable",
  "Meal As Per Plan",
  "All Transfers & Sightseeing By Private Vehicle",
  "All Toll, Tax, Parking, Driver's Allowance"
];

// Old accommodation text to replace
const OLD_ACCOMMODATION_TEXT = "Accommodation in preferred Hotel";
const NEW_ACCOMMODATION_TEXTS = [
  "Accommodation in standard rooms",
  "For pool/beach facing / pvt pool villa/ suites rooms additional charges applicable"
];

// Helper function to update inclusions array
function updateInclusions(existingInclusions: any): string[] {
  let inclusions: string[] = [];
  
  // Parse existing inclusions
  if (Array.isArray(existingInclusions)) {
    inclusions = existingInclusions;
  } else if (typeof existingInclusions === 'string') {
    try {
      inclusions = JSON.parse(existingInclusions);
    } catch (e) {
      inclusions = [existingInclusions];
    }
  } else if (existingInclusions) {
    inclusions = [String(existingInclusions)];
  } else {
    // If no existing inclusions, use the new default
    return NEW_INCLUSIONS;
  }

  // Find and replace the old accommodation text
  const updatedInclusions = inclusions.map(item => {
    if (item === OLD_ACCOMMODATION_TEXT) {
      // Replace with new accommodation policies
      return NEW_ACCOMMODATION_TEXTS;
    }
    return item;
  }).flat();

  // If old text wasn't found, but we have inclusions, add the new accommodation policies at the beginning
  if (!inclusions.some(item => item === OLD_ACCOMMODATION_TEXT) && inclusions.length > 0) {
    // Check if any of the new texts already exist
    const hasNewAccommodationPolicy = NEW_ACCOMMODATION_TEXTS.some(newText => 
      inclusions.some(existing => existing.includes("Accommodation in standard rooms") || existing.includes("pool/beach facing"))
    );
    
    if (!hasNewAccommodationPolicy) {
      // Add new accommodation policies at the beginning
      return [...NEW_ACCOMMODATION_TEXTS, ...inclusions];
    }
  }

  return updatedInclusions;
}

async function updateLocationPolicies() {
  console.log('🏢 Updating Location policies...');
  
  try {
    // Get all locations with existing inclusions
    const locations = await prisma.location.findMany({
      select: {
        id: true,
        label: true,
        inclusions: true
      }
    });

    console.log(`📋 Found ${locations.length} locations to process`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const location of locations) {
      try {
        const updatedInclusions = updateInclusions(location.inclusions);
        
        // Only update if there's a change
        const currentInclusions = Array.isArray(location.inclusions) 
          ? location.inclusions 
          : (location.inclusions ? JSON.parse(location.inclusions as string) : []);
        
        if (JSON.stringify(currentInclusions) !== JSON.stringify(updatedInclusions)) {
          await prisma.location.update({
            where: { id: location.id },
            data: { inclusions: updatedInclusions }
          });
          console.log(`✅ Updated location: ${location.label}`);
          updatedCount++;
        } else {
          console.log(`⏭️ Skipped location (no changes needed): ${location.label}`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`❌ Failed to update location ${location.label}:`, error);
      }
    }

    console.log(`🏢 Location update complete: ${updatedCount} updated, ${skippedCount} skipped`);
  } catch (error) {
    console.error('❌ Error updating location policies:', error);
  }
}

async function updateTourPackagePolicies() {
  console.log('📦 Updating Tour Package policies...');
  
  try {    // Get all tour packages with existing inclusions
    const tourPackages = await prisma.tourPackage.findMany({
      select: {
        id: true,
        tourPackageName: true,
        inclusions: true
      }
    });

    console.log(`📋 Found ${tourPackages.length} tour packages to process`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const tourPackage of tourPackages) {
      try {
        const updatedInclusions = updateInclusions(tourPackage.inclusions);
        
        // Only update if there's a change
        const currentInclusions = Array.isArray(tourPackage.inclusions) 
          ? tourPackage.inclusions 
          : (tourPackage.inclusions ? JSON.parse(tourPackage.inclusions as string) : []);
          if (JSON.stringify(currentInclusions) !== JSON.stringify(updatedInclusions)) {
          await prisma.tourPackage.update({
            where: { id: tourPackage.id },
            data: { inclusions: updatedInclusions }
          });
          console.log(`✅ Updated tour package: ${tourPackage.tourPackageName || tourPackage.id}`);
          updatedCount++;
        } else {
          console.log(`⏭️ Skipped tour package (no changes needed): ${tourPackage.tourPackageName || tourPackage.id}`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`❌ Failed to update tour package ${tourPackage.tourPackageName || tourPackage.id}:`, error);
      }
    }

    console.log(`📦 Tour Package update complete: ${updatedCount} updated, ${skippedCount} skipped`);
  } catch (error) {
    console.error('❌ Error updating tour package policies:', error);
  }
}

async function updateTourPackageQueryPolicies() {
  console.log('🔍 Updating Tour Package Query policies...');
  
  try {
    // Get all tour package queries with existing inclusions
    const tourPackageQueries = await prisma.tourPackageQuery.findMany({
      select: {
        id: true,
        tourPackageQueryName: true,
        inclusions: true
      }
    });

    console.log(`📋 Found ${tourPackageQueries.length} tour package queries to process`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const query of tourPackageQueries) {
      try {
        const updatedInclusions = updateInclusions(query.inclusions);
        
        // Only update if there's a change
        const currentInclusions = Array.isArray(query.inclusions) 
          ? query.inclusions 
          : (query.inclusions ? JSON.parse(query.inclusions as string) : []);
        
        if (JSON.stringify(currentInclusions) !== JSON.stringify(updatedInclusions)) {
          await prisma.tourPackageQuery.update({
            where: { id: query.id },
            data: { inclusions: updatedInclusions }
          });
          console.log(`✅ Updated tour package query: ${query.tourPackageQueryName}`);
          updatedCount++;
        } else {
          console.log(`⏭️ Skipped tour package query (no changes needed): ${query.tourPackageQueryName}`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`❌ Failed to update tour package query ${query.tourPackageQueryName}:`, error);
      }
    }

    console.log(`🔍 Tour Package Query update complete: ${updatedCount} updated, ${skippedCount} skipped`);
  } catch (error) {
    console.error('❌ Error updating tour package query policies:', error);
  }
}

async function main() {
  console.log('🚀 Starting accommodation policies update script...');
  console.log('📝 This script will update all existing records with new accommodation policies:');
  console.log('   - "Accommodation in standard rooms"');
  console.log('   - "For pool/beach facing / pvt pool villa/ suites rooms additional charges applicable"');
  console.log('');

  try {
    await updateLocationPolicies();
    console.log('');
    await updateTourPackagePolicies();
    console.log('');
    await updateTourPackageQueryPolicies();
    console.log('');
    console.log('✅ All accommodation policies updated successfully!');
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main()
    .catch((error) => {
      console.error('❌ Script error:', error);
      process.exit(1);
    });
}

export { main as updateAccommodationPolicies };
