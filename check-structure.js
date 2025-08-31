const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkStructure() {
  try {
    const tourPackage = await prisma.tourPackage.findFirst()
    console.log('Tour Package Structure:', JSON.stringify(tourPackage, null, 2))
    
    const seasonalPeriods = await prisma.locationSeasonalPeriod.findMany({
      take: 3
    })
    console.log('\nSeasonal Periods:', JSON.stringify(seasonalPeriods, null, 2))
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkStructure()
