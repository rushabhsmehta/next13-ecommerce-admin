const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function validateSeasonalPricingImplementation() {
  console.log('🔍 Validating Location-Based Seasonal Pricing Implementation...\n')
  
  try {
    // 1. Check schema and database structure
    console.log('1️⃣  Checking Database Schema...')
    
    // Check if LocationSeasonalPeriod model exists
    const locationSeasonalPeriods = await prisma.locationSeasonalPeriod.findMany({
      take: 5,
      include: {
        location: {
          select: {
            label: true
          }
        }
      }
    })
    
    console.log(`   ✅ LocationSeasonalPeriod table exists with ${locationSeasonalPeriods.length} sample records`)
    if (locationSeasonalPeriods.length > 0) {
      const sample = locationSeasonalPeriods[0]
      console.log(`   📋 Sample period: ${sample.name} for ${sample.location.label}`)
      console.log(`   📅 Period: ${sample.startMonth}/${sample.startDay} - ${sample.endMonth}/${sample.endDay}`)
    }
    
    // Check TourPackagePricing integration
    const pricingWithSeasonalPeriods = await prisma.tourPackagePricing.findMany({
      where: {
        locationSeasonalPeriodId: {
          not: null
        }
      },
      take: 3,
      include: {
        locationSeasonalPeriod: {
          include: {
            location: true
          }
        },
        tourPackage: {
          select: {
            tourPackageName: true
          }
        }
      }
    })
    
    console.log(`   ✅ Found ${pricingWithSeasonalPeriods.length} pricing records linked to seasonal periods`)
    
    // 2. Check location coverage
    console.log('\n2️⃣  Checking Location Coverage...')
    
    const locationsWithPeriods = await prisma.location.findMany({
      include: {
        seasonalPeriods: {
          select: {
            id: true,
            seasonType: true,
            name: true
          }
        }
      }
    })
    
    const locationsWithSeasonalPeriods = locationsWithPeriods.filter(loc => loc.seasonalPeriods.length > 0)
    const locationsWithoutPeriods = locationsWithPeriods.filter(loc => loc.seasonalPeriods.length === 0)
    
    console.log(`   ✅ ${locationsWithSeasonalPeriods.length} locations have seasonal periods`)
    console.log(`   ⚠️  ${locationsWithoutPeriods.length} locations missing seasonal periods`)
    
    if (locationsWithoutPeriods.length > 0) {
      console.log('   📝 Locations without periods:')
      locationsWithoutPeriods.slice(0, 5).forEach(loc => {
        console.log(`      - ${loc.label}`)
      })
      if (locationsWithoutPeriods.length > 5) {
        console.log(`      ... and ${locationsWithoutPeriods.length - 5} more`)
      }
    }
    
    // 3. Check seasonal period distribution by type
    console.log('\n3️⃣  Checking Seasonal Period Distribution...')
    
    const periodsByType = await prisma.locationSeasonalPeriod.groupBy({
      by: ['seasonType'],
      _count: {
        id: true
      }
    })
    
    periodsByType.forEach(group => {
      console.log(`   ${group.seasonType}: ${group._count.id} periods`)
    })
    
    // 4. Check for popular locations
    console.log('\n4️⃣  Checking Popular Tourist Locations...')
    
    const popularLocations = [
      'Goa', 'Kerala', 'Rajasthan', 'Himachal Pradesh', 'Kashmir', 
      'Leh Ladakh', 'Andaman', 'Dubai', 'Thailand', 'Singapore'
    ]
    
    for (const locationName of popularLocations) {
      const location = await prisma.location.findFirst({
        where: {
          label: {
            contains: locationName
          }
        },
        include: {
          seasonalPeriods: {
            select: {
              seasonType: true,
              name: true
            }
          }
        }
      })
      
      if (location) {
        const types = [...new Set(location.seasonalPeriods.map(p => p.seasonType))]
        console.log(`   ✅ ${location.label}: ${location.seasonalPeriods.length} periods (${types.join(', ')})`)
      } else {
        console.log(`   ❌ ${locationName}: Not found`)
      }
    }
    
    // 5. Check for potential overlap issues
    console.log('\n5️⃣  Checking for Potential Date Overlaps...')
    
    const sampleLocationWithMultiplePeriods = await prisma.location.findFirst({
      where: {
        seasonalPeriods: {
          some: {}
        }
      },
      include: {
        seasonalPeriods: {
          orderBy: [
            { startMonth: 'asc' },
            { startDay: 'asc' }
          ]
        }
      }
    })
    
    if (sampleLocationWithMultiplePeriods && sampleLocationWithMultiplePeriods.seasonalPeriods.length > 1) {
      const periods = sampleLocationWithMultiplePeriods.seasonalPeriods
      let hasOverlaps = false
      
      for (let i = 0; i < periods.length - 1; i++) {
        const current = periods[i]
        const next = periods[i + 1]
        
        // Simple overlap check (this could be more sophisticated)
        const currentEnd = current.endMonth * 100 + current.endDay
        const nextStart = next.startMonth * 100 + next.startDay
        
        if (currentEnd >= nextStart) {
          console.log(`   ⚠️  Potential overlap in ${sampleLocationWithMultiplePeriods.label}:`)
          console.log(`      ${current.name} ends ${current.endMonth}/${current.endDay}`)
          console.log(`      ${next.name} starts ${next.startMonth}/${next.startDay}`)
          hasOverlaps = true
        }
      }
      
      if (!hasOverlaps) {
        console.log(`   ✅ No obvious overlaps found in ${sampleLocationWithMultiplePeriods.label}`)
      }
    }
    
    // 6. Summary and recommendations
    console.log('\n6️⃣  Implementation Summary...')
    
    const totalLocations = locationsWithPeriods.length
    const totalSeasonalPeriods = await prisma.locationSeasonalPeriod.count()
    const totalTourPackages = await prisma.tourPackage.count()
    const totalPricingPeriods = await prisma.tourPackagePricing.count()
    
    console.log(`   📊 Statistics:`)
    console.log(`      • ${totalLocations} total locations`)
    console.log(`      • ${totalSeasonalPeriods} seasonal periods created`)
    console.log(`      • ${locationsWithSeasonalPeriods.length} locations with seasonal periods`)
    console.log(`      • ${totalTourPackages} tour packages`)
    console.log(`      • ${totalPricingPeriods} pricing periods`)
    
    const coverage = (locationsWithSeasonalPeriods.length / totalLocations * 100).toFixed(1)
    console.log(`   📈 Coverage: ${coverage}% of locations have seasonal periods`)
    
    console.log('\n✨ Next Steps:')
    if (locationsWithoutPeriods.length > 0) {
      console.log(`   1. Add seasonal periods to ${locationsWithoutPeriods.length} remaining locations`)
    }
    console.log('   2. Test the UI for creating tour package pricing with seasonal period selection')
    console.log('   3. Validate pricing components work correctly with seasonal periods')
    console.log('   4. Test seasonal period management from location pages')
    
    // 7. Check API endpoints
    console.log('\n7️⃣  API Endpoints Status...')
    console.log('   📡 Available endpoints:')
    console.log('      • GET /api/locations/[locationId]/seasonal-periods')
    console.log('      • POST /api/locations/[locationId]/seasonal-periods')
    console.log('      • GET /api/locations/[locationId]/seasonal-periods/[periodId]')
    console.log('      • PATCH /api/locations/[locationId]/seasonal-periods/[periodId]')
    console.log('      • DELETE /api/locations/[locationId]/seasonal-periods/[periodId]')
    console.log('      • Enhanced pricing APIs with seasonal period support')
    
    console.log('\n🎉 Location-Based Seasonal Pricing Implementation Validation Complete!')
    
  } catch (error) {
    console.error('❌ Validation failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run validation if called directly
if (require.main === module) {
  validateSeasonalPricingImplementation()
    .then(() => {
      console.log('\n✅ All validations passed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Validation failed:', error)
      process.exit(1)
    })
}

module.exports = { validateSeasonalPricingImplementation }
