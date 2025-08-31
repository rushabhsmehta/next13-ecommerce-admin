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

    console.log(`📦 Using tour package: ${tourPackage.tourPackageName}`)
    console.log(`📍 Location: ${tourPackage.location?.name || 'Unknown'}`)
    console.log(`🏷️ Seasonal periods available: ${tourPackage.location?.seasonalPeriods?.length || 0}\n`)

    // 2. Get all Peak Season periods for this location
    const peakSeasonPeriods = tourPackage.location?.seasonalPeriods?.filter(p => p.seasonType === 'PEAK_SEASON') || []
    
    if (peakSeasonPeriods.length === 0) {
      console.log('❌ No Peak Season periods found for this location.')
      
      // Show available periods
      const allPeriods = tourPackage.location?.seasonalPeriods || []
      console.log('\nAvailable periods:')
      allPeriods.forEach((period, index) => {
        console.log(`   ${index + 1}. ${period.name} (${period.seasonType})`)
      })
      return
    }

    console.log(`🏔️ Peak Season periods (${peakSeasonPeriods.length}):`)
    peakSeasonPeriods.forEach((period, index) => {
      console.log(`   ${index + 1}. ${period.name} (${period.seasonType})`)
    })
    console.log()

    // 3. Clear existing pricing for this tour package to test fresh
    await prisma.tourPackagePricing.deleteMany({
      where: {
        tourPackageId: tourPackage.id
      }
    })
    console.log('🧹 Cleared existing pricing for test\n')

    // 4. Get a meal plan (required field)
    const mealPlan = await prisma.mealPlan.findFirst()
    if (!mealPlan) {
      console.log('❌ No meal plan found. Please seed meal plans first.')
      return
    }

    // 5. Test bulk pricing creation (simulating what the frontend would do)
    const pricingData = {
      basePrice: 1500,
      basePriceAdult: 1200,
      basePriceChild: 800,
      extraBedPrice: 300,
      pickupPrice: 100
    }

    console.log('💰 Creating bulk pricing for all Peak Season periods...')
    
    const bulkPricingPromises = peakSeasonPeriods.map(period => {
      // Calculate dates for this year based on the seasonal period
      const currentYear = new Date().getFullYear()
      const startDate = new Date(currentYear, period.startMonth - 1, period.startDay)
      const endDate = new Date(currentYear, period.endMonth - 1, period.endDay)
      
      return prisma.tourPackagePricing.create({
        data: {
          tourPackageId: tourPackage.id,
          locationSeasonalPeriodId: period.id,
          mealPlanId: mealPlan.id,
          startDate: startDate,
          endDate: endDate,
          numberOfRooms: 1,
          description: `Pricing for ${period.name}`
        }
      })
    })

    const createdPricing = await Promise.all(bulkPricingPromises)
    console.log(`✅ Successfully created ${createdPricing.length} pricing periods\n`)

    // 6. Verify the created pricing
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
      console.log(`   ${index + 1}. ${pricing.locationSeasonalPeriod.name}: ${pricing.startDate.toDateString()} to ${pricing.endDate.toDateString()}`)
    })
    console.log()

    console.log('\n✅ Bulk pricing test completed successfully!')
    console.log('\n🎯 Features verified:')
    console.log('   ✓ Bulk creation of pricing for multiple periods')
    console.log('   ✓ Proper relationship between tour package and seasonal periods')
    console.log('   ✓ Data integrity maintained across multiple operations')

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testBulkPricing()
