// Simple script to run the accommodation policies update
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const NEW_ACCOMMODATION_TEXTS = [
  "Accommodation in standard rooms",
  "For pool/beach facing / pvt pool villa/ suites rooms additional charges applicable"
];

const OLD_ACCOMMODATION_TEXT = "Accommodation in preferred Hotel";

function updateInclusions(existingInclusions) {
  let inclusions = [];
  
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
    return NEW_ACCOMMODATION_TEXTS.concat([
      "Meal As Per Plan",
      "All Transfers & Sightseeing By Private Vehicle",
      "All Toll, Tax, Parking, Driver's Allowance"
    ]);
  }

  const updatedInclusions = inclusions.map(item => {
    if (item === OLD_ACCOMMODATION_TEXT) {
      return NEW_ACCOMMODATION_TEXTS;
    }
    return item;
  }).flat();

  if (!inclusions.some(item => item === OLD_ACCOMMODATION_TEXT) && inclusions.length > 0) {
    const hasNewAccommodationPolicy = NEW_ACCOMMODATION_TEXTS.some(newText => 
      inclusions.some(existing => existing.includes("Accommodation in standard rooms") || existing.includes("pool/beach facing"))
    );
    
    if (!hasNewAccommodationPolicy) {
      return NEW_ACCOMMODATION_TEXTS.concat(inclusions);
    }
  }

  return updatedInclusions;
}

async function main() {
  console.log('🚀 Starting accommodation policies update...');
  
  try {
    // Update Locations
    console.log('🏢 Updating Locations...');
    const locations = await prisma.location.findMany();
    let locationUpdates = 0;
    
    for (const location of locations) {
      const updatedInclusions = updateInclusions(location.inclusions);
      const currentInclusions = Array.isArray(location.inclusions) 
        ? location.inclusions 
        : (location.inclusions ? JSON.parse(location.inclusions) : []);
      
      if (JSON.stringify(currentInclusions) !== JSON.stringify(updatedInclusions)) {
        await prisma.location.update({
          where: { id: location.id },
          data: { inclusions: updatedInclusions }
        });
        console.log(`✅ Updated location: ${location.label}`);
        locationUpdates++;
      }
    }
    console.log(`📍 Locations: ${locationUpdates} updated out of ${locations.length}`);    // Update Tour Packages
    console.log('📦 Updating Tour Packages...');
    const tourPackages = await prisma.tourPackage.findMany({
      select: {
        id: true,
        tourPackageName: true,
        inclusions: true
      }
    });
    let packageUpdates = 0;
    
    for (const pkg of tourPackages) {
      const updatedInclusions = updateInclusions(pkg.inclusions);
      const currentInclusions = Array.isArray(pkg.inclusions) 
        ? pkg.inclusions 
        : (pkg.inclusions ? JSON.parse(pkg.inclusions) : []);
      
      if (JSON.stringify(currentInclusions) !== JSON.stringify(updatedInclusions)) {
        await prisma.tourPackage.update({
          where: { id: pkg.id },
          data: { inclusions: updatedInclusions }
        });
        console.log(`✅ Updated tour package: ${pkg.tourPackageName || pkg.id}`);
        packageUpdates++;
      }
    }
    console.log(`📦 Tour Packages: ${packageUpdates} updated out of ${tourPackages.length}`);

    // Update Tour Package Queries
    console.log('🔍 Updating Tour Package Queries...');
    const queries = await prisma.tourPackageQuery.findMany();
    let queryUpdates = 0;
    
    for (const query of queries) {
      const updatedInclusions = updateInclusions(query.inclusions);
      const currentInclusions = Array.isArray(query.inclusions) 
        ? query.inclusions 
        : (query.inclusions ? JSON.parse(query.inclusions) : []);
      
      if (JSON.stringify(currentInclusions) !== JSON.stringify(updatedInclusions)) {
        await prisma.tourPackageQuery.update({
          where: { id: query.id },
          data: { inclusions: updatedInclusions }
        });
        console.log(`✅ Updated query: ${query.tourPackageQueryName}`);
        queryUpdates++;
      }
    }
    console.log(`🔍 Tour Package Queries: ${queryUpdates} updated out of ${queries.length}`);

    console.log('');
    console.log('✅ SUMMARY:');
    console.log(`📍 Locations updated: ${locationUpdates}/${locations.length}`);
    console.log(`📦 Tour Packages updated: ${packageUpdates}/${tourPackages.length}`);
    console.log(`🔍 Tour Package Queries updated: ${queryUpdates}/${queries.length}`);
    console.log('');
    console.log('🎉 All accommodation policies updated successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
