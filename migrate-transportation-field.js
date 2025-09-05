const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function migrateTransportationField() {
  try {
    console.log('Starting transportation field migration...')

    // Step 1: Add transportation column to TourPackagePricing table
    console.log('Adding transportation column to TourPackagePricing table...')
    await prisma.$executeRaw`
      ALTER TABLE TourPackagePricing 
      ADD COLUMN transportation TEXT NULL
    `

    // Step 2: Migrate existing transportation data from PricingComponent to TourPackagePricing
    console.log('Migrating existing transportation data...')
    
    const pricingPeriods = await prisma.tourPackagePricing.findMany({
      include: {
        pricingComponents: true
      }
    })

    for (const period of pricingPeriods) {
      // Find if any component has transportation data
      const transportationData = period.pricingComponents
        .map(comp => comp.transportation)
        .filter(t => t && t.trim())
        .join(', ')

      if (transportationData) {
        await prisma.tourPackagePricing.update({
          where: { id: period.id },
          data: { transportation: transportationData }
        })
        console.log(`Migrated transportation data for pricing period ${period.id}: ${transportationData}`)
      }
    }

    // Step 3: Remove transportation column from PricingComponent table
    console.log('Removing transportation column from PricingComponent table...')
    await prisma.$executeRaw`
      ALTER TABLE PricingComponent 
      DROP COLUMN transportation
    `

    console.log('Migration completed successfully!')

  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
migrateTransportationField()
  .catch((error) => {
    console.error('Migration script failed:', error)
    process.exit(1)
  })
