const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateTransportationToVehicleType() {
  try {
    console.log('Starting transportation to vehicle type migration...');

    // Step 1: Check if vehicleTypeId column exists, if not add it
    console.log('Checking if vehicleTypeId column exists...');
    try {
      await prisma.$executeRaw`
        ALTER TABLE TourPackagePricing 
        ADD COLUMN vehicleTypeId VARCHAR(191) NULL,
        ADD INDEX TourPackagePricing_vehicleTypeId_idx (vehicleTypeId)
      `;
      console.log('Added vehicleTypeId column to TourPackagePricing table...');
    } catch (error) {
      if (error.meta?.code === '1060') {
        console.log('vehicleTypeId column already exists, continuing...');
      } else {
        throw error;
      }
    }

    // Step 2: Get all vehicle types for mapping
    const vehicleTypes = await prisma.vehicleType.findMany({
      where: { isActive: true }
    });
    
    console.log(`Found ${vehicleTypes.length} vehicle types:`, vehicleTypes.map(vt => vt.name));

    // Step 3: Check if transportation column exists and migrate data if it does
    try {
      // Check if transportation column exists using raw SQL
      const columns = await prisma.$queryRaw`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'TourPackagePricing' AND COLUMN_NAME = 'transportation'
      `;
      
      if (columns.length > 0) {
        console.log('Transportation column exists, migrating data...');
        
        // Get existing transportation data using raw SQL
        const pricingPeriods = await prisma.$queryRaw`
          SELECT id, transportation FROM TourPackagePricing 
          WHERE transportation IS NOT NULL AND transportation != ''
        `;

        console.log(`Migrating ${pricingPeriods.length} pricing periods with transportation data...`);

        for (const period of pricingPeriods) {
          // Try to match transportation text with vehicle type names
          const matchingVehicleType = vehicleTypes.find(vt => 
            period.transportation && (
              period.transportation.toLowerCase().includes(vt.name.toLowerCase()) ||
              vt.name.toLowerCase().includes(period.transportation.toLowerCase())
            )
          );

          if (matchingVehicleType) {
            await prisma.$executeRaw`
              UPDATE TourPackagePricing 
              SET vehicleTypeId = ${matchingVehicleType.id}
              WHERE id = ${period.id}
            `;
            console.log(`Mapped "${period.transportation}" to "${matchingVehicleType.name}"`);
          } else {
            console.log(`Could not match transportation: "${period.transportation}"`);
          }
        }

        // Step 4: Remove transportation column from TourPackagePricing table
        console.log('Removing transportation column from TourPackagePricing table...');
        await prisma.$executeRaw`ALTER TABLE TourPackagePricing DROP COLUMN transportation`;
        console.log('Transportation column removed successfully!');
      } else {
        console.log('Transportation column does not exist, migration already completed.');
      }
    } catch (error) {
      console.error('Error during transportation column migration:', error);
      throw error;
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateTransportationToVehicleType();
