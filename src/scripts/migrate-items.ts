

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateData() {
  console.log('Starting data migration...');
  
  // Migrate Purchase Details to Purchase Items
  console.log('Migrating purchase details...');
  const purchaseDetails = await prisma.purchaseDetail.findMany({
    where: {
      // Find records that don't have associated items yet
      items: {
        none: {}
      }
    },
    include: {
      tourPackageQuery: {
        select: {
          tourPackageQueryName: true
        }
      }
    }
  });
  
  console.log(`Found ${purchaseDetails.length} purchase details to migrate`);
  
  for (const detail of purchaseDetails) {
    const packageName = detail.tourPackageQuery?.tourPackageQueryName || 'Unknown Package';
    
    // Create a single PurchaseItem for each PurchaseDetail
    await prisma.purchaseItem.create({
      data: {
        purchaseDetailId: detail.id,
        productName: packageName,
        description: detail.description || `Package: ${packageName}`,
        quantity: 1,
        pricePerUnit: detail.price,
        totalAmount: detail.price,
        // If you have GST information, you can set it here
        taxAmount: detail.gstAmount || null,
      }
    });
    
    console.log(`Migrated purchase detail ID: ${detail.id} - ${packageName}`);
  }
  
  // Migrate Sale Details to Sale Items
  console.log('Migrating sale details...');
  const saleDetails = await prisma.saleDetail.findMany({
    where: {
      // Find records that don't have associated items yet
      items: {
        none: {}
      }
    },
    include: {
      tourPackageQuery: {
        select: {
          tourPackageQueryName: true
        }
      }
    }
  });
  
  console.log(`Found ${saleDetails.length} sale details to migrate`);
  
  for (const detail of saleDetails) {
    const packageName = detail.tourPackageQuery?.tourPackageQueryName || 'Unknown Package';
    
    // Create a single SaleItem for each SaleDetail
    await prisma.saleItem.create({
      data: {
        saleDetailId: detail.id,
        productName: packageName,
        description: detail.description || `Package: ${packageName}`,
        quantity: 1,
        pricePerUnit: detail.salePrice,
        totalAmount: detail.salePrice,
        // If you have GST information, you can set it here
        taxAmount: detail.gstAmount || null,
      }
    });
    
    console.log(`Migrated sale detail ID: ${detail.id} - ${packageName}`);
  }
  
  console.log('Migration completed successfully.');
}

migrateData()
  .catch((e) => {
    console.error('Error during migration:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });