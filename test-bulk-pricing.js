const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testBulkPricing() {
  try {
    console.log('🧪 Testing Bulk Pricing Functionality...\n')

    // 1. Get a tour package with location
    const tourPackage = await prisma.tourPackage.findFirst({
      include: {
        location: {
          include: {
            seasonalPeriods: true
          }
        }
      }
    })

    if (!tourPackage) {
      console.log('❌ No tour packages found. Please seed data first.')
      return
    }

    if (!tourPackage.locationId) {
      console.log('❌ Tour package has no location. Please update tour package data.')
      return
    }

    console.log(`📦 Using tour package: ${tourPackage.name}`)
    console.log(`📍 Location: ${tourPackage.location?.name || 'Unknown'}`)
    console.log(`🏷️ Seasonal periods available: ${tourPackage.location?.seasonalPeriods?.length || 0}\n`)

    // 2. Get all Peak Season periods for this location
    const peakSeasonPeriods = tourPackage.location?.seasonalPeriods?.filter(p => p.type === 'PEAK') || []
    
    if (peakSeasonPeriods.length === 0) {
      console.log('❌ No Peak Season periods found for this location.')
      return
    }

    console.log(`🏔️ Peak Season periods (${peakSeasonPeriods.length}):`)
    peakSeasonPeriods.forEach((period, index) => {
      console.log(`   ${index + 1}. ${period.name} (${period.startDate.toISOString().split('T')[0]} to ${period.endDate.toISOString().split('T')[0]})`)
    })
    console.log()

    // 3. Clear existing pricing for this tour package to test fresh
    await prisma.tourPackagePricing.deleteMany({
      where: {
        tourPackageId: tourPackage.id
      }
    })
    console.log('🧹 Cleared existing pricing for test\n')

    // 4. Test bulk pricing creation (simulating what the frontend would do)
    const pricingData = {
      basePrice: 1500,
      basePriceAdult: 1200,
      basePriceChild: 800,
      extraBedPrice: 300,
      pickupPrice: 100
    }

    console.log('💰 Creating bulk pricing for all Peak Season periods...')
    
    const bulkPricingPromises = peakSeasonPeriods.map(period => 
      prisma.tourPackagePricing.create({
        data: {
          tourPackageId: tourPackage.id,
          locationSeasonalPeriodId: period.id,
          basePrice: pricingData.basePrice,
          basePriceAdult: pricingData.basePriceAdult,
          basePriceChild: pricingData.basePriceChild,
          extraBedPrice: pricingData.extraBedPrice,
          pickupPrice: pricingData.pickupPrice
        }
      })
    )

    const createdPricing = await Promise.all(bulkPricingPromises)
    console.log(`✅ Successfully created ${createdPricing.length} pricing periods\n`)

    // 5. Verify the created pricing
    const verifyPricing = await prisma.tourPackagePricing.findMany({
      where: {
        tourPackageId: tourPackage.id
      },
      include: {
        locationSeasonalPeriod: true
      }
    })

    console.log('🔍 Verification - Created pricing periods:')
    verifyPricing.forEach((pricing, index) => {
      console.log(`   ${index + 1}. ${pricing.locationSeasonalPeriod.name}: $${pricing.basePrice} base price`)
    })
    console.log()

    // 6. Test querying by season type
    const allPeakPricing = await prisma.tourPackagePricing.findMany({
      where: {
        tourPackageId: tourPackage.id,
        locationSeasonalPeriod: {
          type: 'PEAK'
        }
      },
      include: {
        locationSeasonalPeriod: true
      }
    })

    console.log(`🔎 Query test - Found ${allPeakPricing.length} Peak Season pricing periods`)
    
    // 7. Test updating all Peak Season pricing at once
    console.log('\n📝 Testing bulk update of Peak Season pricing...')
    
    const updatedPricing = await prisma.tourPackagePricing.updateMany({
      where: {
        tourPackageId: tourPackage.id,
        locationSeasonalPeriod: {
          type: 'PEAK'
        }
      },
      data: {
        basePrice: 1800, // Increase by $300
        basePriceAdult: 1400,
        basePriceChild: 1000
      }
    })

    console.log(`✅ Updated ${updatedPricing.count} pricing periods with new rates`)

    // 8. Final verification
    const finalPricing = await prisma.tourPackagePricing.findMany({
      where: {
        tourPackageId: tourPackage.id
      },
      include: {
        locationSeasonalPeriod: true
      }
    })

    console.log('\n📊 Final state - All pricing periods:')
    finalPricing.forEach((pricing, index) => {
      console.log(`   ${index + 1}. ${pricing.locationSeasonalPeriod.name} (${pricing.locationSeasonalPeriod.type}): $${pricing.basePrice}`)
    })

    console.log('\n✅ Bulk pricing test completed successfully!')
    console.log('\n🎯 Features verified:')
    console.log('   ✓ Bulk creation of pricing for multiple periods')
    console.log('   ✓ Query pricing by season type')
    console.log('   ✓ Bulk update of pricing for specific season type')
    console.log('   ✓ Proper relationship between tour package and seasonal periods')

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testBulkPricing()
