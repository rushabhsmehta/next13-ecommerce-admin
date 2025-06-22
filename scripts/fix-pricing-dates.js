/**
 * Migration script to fix timezone-shifted dates in pricing periods
 * This script converts existing dates that were incorrectly stored due to timezone issues
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixPricingDates() {
  console.log('Starting pricing dates migration...');
  
  try {
    // Get all pricing periods
    const pricingPeriods = await prisma.pricingPeriod.findMany({
      select: {
        id: true,
        startDate: true,
        endDate: true,
        tourPackageId: true
      }
    });

    console.log(`Found ${pricingPeriods.length} pricing periods to check`);

    let fixedCount = 0;

    for (const period of pricingPeriods) {
      // Check if dates look like they have timezone shift (time is 18:30:00.000Z)
      const startTimeString = period.startDate.toISOString();
      const endTimeString = period.endDate.toISOString();
      
      const hasTimezoneShift = startTimeString.includes('T18:30:00.000Z') || 
                              endTimeString.includes('T18:30:00.000Z');

      if (hasTimezoneShift) {
        console.log(`Fixing period ${period.id}:`);
        console.log(`  Original start: ${startTimeString}`);
        console.log(`  Original end: ${endTimeString}`);
        
        // Extract the intended date and set it to midnight UTC
        const startDate = new Date(period.startDate);
        const endDate = new Date(period.endDate);
        
        // Add 5.5 hours (IST offset) to get back to the intended date
        const correctedStartDate = new Date(Date.UTC(
          startDate.getUTCFullYear(),
          startDate.getUTCMonth(),
          startDate.getUTCDate() + 1, // Add 1 day to fix the shift
          0, 0, 0, 0
        ));
        
        const correctedEndDate = new Date(Date.UTC(
          endDate.getUTCFullYear(),
          endDate.getUTCMonth(),
          endDate.getUTCDate() + 1, // Add 1 day to fix the shift
          0, 0, 0, 0
        ));

        console.log(`  Corrected start: ${correctedStartDate.toISOString()}`);
        console.log(`  Corrected end: ${correctedEndDate.toISOString()}`);

        // Update the database
        await prisma.pricingPeriod.update({
          where: { id: period.id },
          data: {
            startDate: correctedStartDate,
            endDate: correctedEndDate
          }
        });

        fixedCount++;
        console.log(`  ✅ Fixed period ${period.id}`);
      } else {
        console.log(`Period ${period.id} looks correct, skipping`);
      }
    }

    console.log(`\n✅ Migration completed! Fixed ${fixedCount} pricing periods.`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
if (require.main === module) {
  fixPricingDates()
    .then(() => {
      console.log('Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixPricingDates };
