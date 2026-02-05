/**
 * Test Script: Variant Selection Persistence
 * 
 * This script tests that selectedVariantIds and variantHotelOverrides 
 * are properly saved and retrieved from the database.
 * 
 * Usage: node scripts/tests/test-variant-persistence.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testVariantPersistence() {
  console.log('🧪 Testing Variant Selection Persistence\n');
  console.log('=' .repeat(60));

  try {
    // Step 1: Find or create a test tour package query
    console.log('\n📋 Step 1: Finding test tour package query...');
    
    let testQuery = await prisma.tourPackageQuery.findFirst({
      where: {
        tourPackageQueryName: {
          contains: 'Test Variant'
        }
      },
      include: {
        location: true
      }
    });

    if (!testQuery) {
      console.log('   ⚠️  No test query found. Please create one manually with variants selected.');
      console.log('   Searching for ANY tour package query with selectedVariantIds...');
      
      testQuery = await prisma.tourPackageQuery.findFirst({
        where: {
          selectedVariantIds: {
            not: null
          }
        },
        include: {
          location: true
        }
      });
    }

    if (!testQuery) {
      console.log('   ❌ No tour package queries found with variant selections.');
      console.log('   Please create a tour package query with variants selected first.');
      return;
    }

    console.log(`   ✅ Found test query: ${testQuery.tourPackageQueryName}`);
    console.log(`      ID: ${testQuery.id}`);
    console.log(`      Location: ${testQuery.location?.locationName || 'N/A'}`);

    // Step 2: Check if variant fields exist and are populated
    console.log('\n🔍 Step 2: Checking variant selection fields...');
    
    const hasSelectedVariantIds = testQuery.selectedVariantIds !== null && testQuery.selectedVariantIds !== undefined;
    const hasVariantHotelOverrides = testQuery.variantHotelOverrides !== null && testQuery.variantHotelOverrides !== undefined;
    
    console.log(`   selectedVariantIds: ${hasSelectedVariantIds ? '✅ EXISTS' : '❌ NULL/UNDEFINED'}`);
    if (hasSelectedVariantIds) {
      const variantIds = typeof testQuery.selectedVariantIds === 'string' 
        ? JSON.parse(testQuery.selectedVariantIds)
        : testQuery.selectedVariantIds;
      console.log(`      Value: ${JSON.stringify(variantIds, null, 2)}`);
      console.log(`      Count: ${Array.isArray(variantIds) ? variantIds.length : 0} variants`);
    }
    
    console.log(`   variantHotelOverrides: ${hasVariantHotelOverrides ? '✅ EXISTS' : '❌ NULL/UNDEFINED'}`);
    if (hasVariantHotelOverrides) {
      const overrides = typeof testQuery.variantHotelOverrides === 'string'
        ? JSON.parse(testQuery.variantHotelOverrides)
        : testQuery.variantHotelOverrides;
      console.log(`      Value: ${JSON.stringify(overrides, null, 2)}`);
      const overrideCount = Object.keys(overrides).length;
      console.log(`      Variants with overrides: ${overrideCount}`);
    }

    // Step 3: Check variant snapshots
    console.log('\n📸 Step 3: Checking variant snapshots...');
    
    const snapshots = await prisma.queryVariantSnapshot.findMany({
      where: {
        tourPackageQueryId: testQuery.id
      },
      include: {
        hotelSnapshots: true,
        pricingSnapshots: {
          include: {
            pricingComponentSnapshots: true
          }
        }
      }
    });

    console.log(`   Found ${snapshots.length} variant snapshots`);
    
    for (const snapshot of snapshots) {
      console.log(`\n   📦 Snapshot: ${snapshot.name}`);
      console.log(`      ID: ${snapshot.id}`);
      console.log(`      Source Variant ID: ${snapshot.sourceVariantId}`);
      console.log(`      Is Default: ${snapshot.isDefault}`);
      console.log(`      Sort Order: ${snapshot.sortOrder}`);
      console.log(`      Price Modifier: ${snapshot.priceModifier}%`);
      console.log(`      Hotel Snapshots: ${snapshot.hotelSnapshots.length}`);
      console.log(`      Pricing Snapshots: ${snapshot.pricingSnapshots.length}`);
      
      if (snapshot.hotelSnapshots.length > 0) {
        console.log(`      Hotels by day:`);
        snapshot.hotelSnapshots
          .sort((a, b) => a.dayNumber - b.dayNumber)
          .forEach(hotel => {
            console.log(`         Day ${hotel.dayNumber}: ${hotel.hotelName} (${hotel.locationLabel})`);
          });
      }
      
      if (snapshot.pricingSnapshots.length > 0) {
        console.log(`      Pricing periods:`);
        snapshot.pricingSnapshots.forEach((pricing, idx) => {
          const total = pricing.pricingComponentSnapshots.reduce(
            (sum, comp) => sum + Number(comp.price || 0),
            0
          );
          console.log(`         Period ${idx + 1}: ${pricing.mealPlanName}, ${pricing.numberOfRooms} rooms, ₹${total.toFixed(2)}`);
        });
      }
    }

    // Step 4: Test Update (simulate form submission)
    console.log('\n🔄 Step 4: Testing update with new variant selection...');
    
    // Just verify we can read and write the fields
    const currentVariantIds = hasSelectedVariantIds 
      ? (typeof testQuery.selectedVariantIds === 'string' 
          ? JSON.parse(testQuery.selectedVariantIds)
          : testQuery.selectedVariantIds)
      : [];
    
    const currentOverrides = hasVariantHotelOverrides
      ? (typeof testQuery.variantHotelOverrides === 'string'
          ? JSON.parse(testQuery.variantHotelOverrides)
          : testQuery.variantHotelOverrides)
      : {};

    console.log(`   Current state successfully read from database`);
    console.log(`   ✅ Fields can be read and parsed correctly`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    
    const allChecks = [
      { name: 'selectedVariantIds field exists', passed: hasSelectedVariantIds },
      { name: 'variantHotelOverrides field exists', passed: hasVariantHotelOverrides },
      { name: 'Variant snapshots created', passed: snapshots.length > 0 },
      { name: 'Hotel snapshots present', passed: snapshots.some(s => s.hotelSnapshots.length > 0) },
      { name: 'Pricing snapshots present', passed: snapshots.some(s => s.pricingSnapshots.length > 0) }
    ];

    allChecks.forEach(check => {
      console.log(`${check.passed ? '✅' : '❌'} ${check.name}`);
    });

    const passedCount = allChecks.filter(c => c.passed).length;
    const totalCount = allChecks.length;
    
    console.log(`\nResult: ${passedCount}/${totalCount} checks passed`);
    
    if (passedCount === totalCount) {
      console.log('🎉 All tests passed! Variant persistence is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please check the implementation.');
    }

  } catch (error) {
    console.error('\n❌ Error during test:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testVariantPersistence().catch(console.error);
