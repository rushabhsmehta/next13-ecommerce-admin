// Use CommonJS syntax for the migration script
// Import the singleton Prisma client
const prisma = require('../../lib/prismadb');

async function migrateItems() {
  try {
    console.log('🔍 Testing database connection...');
    
    try {
      // Test the database connection first
      const connectionTest = await prisma.$queryRaw`SELECT 1 as connected`;
      console.log('✅ Database connection successful:', connectionTest);
    } catch (connectionError) {
      console.error('❌ Database connection failed:', connectionError);
      console.error('Please check your database connection settings in .env file');
      return; // Exit if connection failed
    }
    
    console.log('\n🚀 Starting migration process...');
    let purchaseItemsCreated = 0;
    let saleItemsCreated = 0;
    
    // ---- MIGRATE PURCHASE DETAILS ----
    console.log('\n📦 Migrating purchase details to purchase items...');
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
            tourPackageQueryName: true,
            id: true
          }
        },
        supplier: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log(`📊 Found ${purchaseDetails.length} purchase details to migrate`);
    
    // Process purchases in batches to avoid overwhelming the database
    for (const detail of purchaseDetails) {
      const packageName = detail.tourPackageQuery?.tourPackageQueryName || 'Unknown Package';
      const supplierName = detail.supplier?.name || 'Unknown Supplier';
      
      try {
        // Create a single PurchaseItem for each PurchaseDetail
        await prisma.purchaseItem.create({
          data: {
            purchaseDetailId: detail.id,
            productName: packageName,
            description: detail.description || `Package: ${packageName} | Supplier: ${supplierName}`,
            quantity: 1,
            pricePerUnit: detail.price || 0,
            discountAmount: detail.discount || 0,
            totalAmount: (detail.price || 0) - (detail.discount || 0) + (detail.gstAmount || 0),
            taxAmount: detail.gstAmount || null,
            taxSlabId: detail.taxSlabId || null,
          }
        });
        
        purchaseItemsCreated++;
        console.log(`   ✓ Migrated purchase ID: ${detail.id} - ${packageName} (${supplierName})`);
      } catch (itemError) {
        console.error(`   ✗ Failed to migrate purchase detail ID: ${detail.id}`, itemError);
      }
    }
    
    // ---- MIGRATE SALE DETAILS ----
    console.log('\n💰 Migrating sale details to sale items...');
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
            tourPackageQueryName: true,
            id: true
          }
        },
        customer: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log(`📊 Found ${saleDetails.length} sale details to migrate`);
    
    // Process sales
    for (const detail of saleDetails) {
      const packageName = detail.tourPackageQuery?.tourPackageQueryName || 'Unknown Package';
      const customerName = detail.customer?.name || 'Unknown Customer';
      
      try {
        // Create a single SaleItem for each SaleDetail
        await prisma.saleItem.create({
          data: {
            saleDetailId: detail.id,
            productName: packageName,
            description: detail.description || `Package: ${packageName} | Customer: ${customerName}`,
            quantity: 1,
            pricePerUnit: detail.salePrice || 0,
            discountAmount: detail.discount || 0,
            totalAmount: (detail.salePrice || 0) - (detail.discount || 0) + (detail.gstAmount || 0),
            taxAmount: detail.gstAmount || null,
            taxSlabId: detail.taxSlabId || null,
          }
        });
        
        saleItemsCreated++;
        console.log(`   ✓ Migrated sale ID: ${detail.id} - ${packageName} (${customerName})`);
      } catch (itemError) {
        console.error(`   ✗ Failed to migrate sale detail ID: ${detail.id}`, itemError);
      }
    }
    
    // ---- VERIFICATION ----
    console.log('\n🔍 Verifying migration results...');
    const purchaseItemsCount = await prisma.purchaseItem.count();
    const saleItemsCount = await prisma.saleItem.count();
    
    console.log('\n📝 Migration Summary:');
    console.log(`   - Purchase details processed: ${purchaseDetails.length}`);
    console.log(`   - Purchase items created: ${purchaseItemsCreated}`);
    console.log(`   - Sale details processed: ${saleDetails.length}`);
    console.log(`   - Sale items created: ${saleItemsCreated}`);
    console.log(`   - Total purchase items in database: ${purchaseItemsCount}`);
    console.log(`   - Total sale items in database: ${saleItemsCount}`);
    
    if (purchaseItemsCreated === purchaseDetails.length && 
        saleItemsCreated === saleDetails.length) {
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log('\n⚠️ Migration completed with some issues. See logs above for details.');
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed with error:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n👋 Database connection closed');
  }
}

// Execute the migration
console.log('🔄 Starting migration script at', new Date().toLocaleString());
migrateItems()
  .then(() => console.log('🏁 Script execution completed at', new Date().toLocaleString()))
  .catch(err => console.error('🚨 Script execution failed:', err));