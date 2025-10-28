/**
 * 🗑️ Cleanup WhatsApp Data from MySQL
 * 
 * This script deletes all WhatsApp integration data from the MySQL database
 * after successful migration to PostgreSQL.
 * 
 * ⚠️ WARNING: This is a DESTRUCTIVE operation!
 * - Only run this AFTER verifying the PostgreSQL migration is successful
 * - Make sure you have a backup of your MySQL database
 * - Ensure the app is running on PostgreSQL and working correctly
 * 
 * Usage: node scripts/migration/cleanup-mysql-whatsapp-data.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupWhatsAppData() {
  console.log('🗑️  MySQL WhatsApp Data Cleanup Script');
  console.log('=====================================\n');

  console.log('⚠️  WARNING: This will DELETE all WhatsApp data from MySQL!');
  console.log('⚠️  Make sure you have:');
  console.log('   1. ✅ Verified PostgreSQL migration is complete');
  console.log('   2. ✅ Tested the app with PostgreSQL');
  console.log('   3. ✅ Created a MySQL backup\n');

  // Wait 5 seconds to give user time to cancel if needed
  console.log('⏳ Starting deletion in 5 seconds... (Press Ctrl+C to cancel)\n');
  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    console.log('🔍 Checking current record counts in MySQL...\n');

    // Count records before deletion
    const counts = {
      whatsAppCampaignRecipient: await prisma.whatsAppCampaignRecipient.count(),
      whatsAppCampaign: await prisma.whatsAppCampaign.count(),
      whatsAppMessage: await prisma.whatsAppMessage.count(),
      whatsAppCustomer: await prisma.whatsAppCustomer.count(),
      whatsAppAnalyticsEvent: await prisma.whatsAppAnalyticsEvent.count(),
      whatsAppTemplate: await prisma.whatsAppTemplate.count(),
      whatsAppSession: await prisma.whatsAppSession.count(),
      whatsAppProductVariant: await prisma.whatsAppProductVariant.count(),
      whatsAppProduct: await prisma.whatsAppProduct.count(),
      whatsAppTourPackageVariant: await prisma.whatsAppTourPackageVariant.count(),
      whatsAppTourPackage: await prisma.whatsAppTourPackage.count(),
      whatsAppCatalog: await prisma.whatsAppCatalog.count(),
      whatsAppMediaAsset: await prisma.whatsAppMediaAsset.count(),
      whatsAppCartItem: await prisma.whatsAppCartItem.count(),
      whatsAppCart: await prisma.whatsAppCart.count(),
      whatsAppOrder: await prisma.whatsAppOrder.count(),
      whatsAppOrderItem: await prisma.whatsAppOrderItem.count(),
      whatsAppAutomation: await prisma.whatsAppAutomation.count(),
      whatsAppFlowVersion: await prisma.whatsAppFlowVersion.count(),
    };

    let totalRecords = 0;
    console.log('📊 Current counts in MySQL:');
    for (const [model, count] of Object.entries(counts)) {
      if (count > 0) {
        console.log(`   ${model}: ${count}`);
        totalRecords += count;
      }
    }
    console.log(`\n   Total records to delete: ${totalRecords}\n`);

    if (totalRecords === 0) {
      console.log('✅ No WhatsApp data found in MySQL. Already clean!');
      return;
    }

    console.log('🗑️  Starting deletion (in correct order to respect foreign keys)...\n');

    // Delete in reverse order of dependencies
    const deletions = [];

    // 1. Delete campaign recipients first (depends on campaigns and customers)
    if (counts.whatsAppCampaignRecipient > 0) {
      const result = await prisma.whatsAppCampaignRecipient.deleteMany({});
      deletions.push({ model: 'WhatsAppCampaignRecipient', count: result.count });
      console.log(`   ✅ Deleted ${result.count} campaign recipients`);
    }

    // 2. Delete campaigns
    if (counts.whatsAppCampaign > 0) {
      const result = await prisma.whatsAppCampaign.deleteMany({});
      deletions.push({ model: 'WhatsAppCampaign', count: result.count });
      console.log(`   ✅ Deleted ${result.count} campaigns`);
    }

    // 3. Delete messages
    if (counts.whatsAppMessage > 0) {
      const result = await prisma.whatsAppMessage.deleteMany({});
      deletions.push({ model: 'WhatsAppMessage', count: result.count });
      console.log(`   ✅ Deleted ${result.count} messages`);
    }

    // 4. Delete customers
    if (counts.whatsAppCustomer > 0) {
      const result = await prisma.whatsAppCustomer.deleteMany({});
      deletions.push({ model: 'WhatsAppCustomer', count: result.count });
      console.log(`   ✅ Deleted ${result.count} customers`);
    }

    // 5. Delete analytics events
    if (counts.whatsAppAnalyticsEvent > 0) {
      const result = await prisma.whatsAppAnalyticsEvent.deleteMany({});
      deletions.push({ model: 'WhatsAppAnalyticsEvent', count: result.count });
      console.log(`   ✅ Deleted ${result.count} analytics events`);
    }

    // 6. Delete order items (depends on orders)
    if (counts.whatsAppOrderItem > 0) {
      const result = await prisma.whatsAppOrderItem.deleteMany({});
      deletions.push({ model: 'WhatsAppOrderItem', count: result.count });
      console.log(`   ✅ Deleted ${result.count} order items`);
    }

    // 7. Delete orders
    if (counts.whatsAppOrder > 0) {
      const result = await prisma.whatsAppOrder.deleteMany({});
      deletions.push({ model: 'WhatsAppOrder', count: result.count });
      console.log(`   ✅ Deleted ${result.count} orders`);
    }

    // 8. Delete carts (depends on cart items)
    if (counts.whatsAppCartItem > 0) {
      const result = await prisma.whatsAppCartItem.deleteMany({});
      deletions.push({ model: 'WhatsAppCartItem', count: result.count });
      console.log(`   ✅ Deleted ${result.count} cart items`);
    }

    // 9. Delete carts
    if (counts.whatsAppCart > 0) {
      const result = await prisma.whatsAppCart.deleteMany({});
      deletions.push({ model: 'WhatsAppCart', count: result.count });
      console.log(`   ✅ Deleted ${result.count} carts`);
    }

    // 10. Delete product variants (depends on products)
    if (counts.whatsAppProductVariant > 0) {
      const result = await prisma.whatsAppProductVariant.deleteMany({});
      deletions.push({ model: 'WhatsAppProductVariant', count: result.count });
      console.log(`   ✅ Deleted ${result.count} product variants`);
    }

    // 11. Delete products
    if (counts.whatsAppProduct > 0) {
      const result = await prisma.whatsAppProduct.deleteMany({});
      deletions.push({ model: 'WhatsAppProduct', count: result.count });
      console.log(`   ✅ Deleted ${result.count} products`);
    }

    // 12. Delete tour package variants (depends on tour packages)
    if (counts.whatsAppTourPackageVariant > 0) {
      const result = await prisma.whatsAppTourPackageVariant.deleteMany({});
      deletions.push({ model: 'WhatsAppTourPackageVariant', count: result.count });
      console.log(`   ✅ Deleted ${result.count} tour package variants`);
    }

    // 13. Delete tour packages
    if (counts.whatsAppTourPackage > 0) {
      const result = await prisma.whatsAppTourPackage.deleteMany({});
      deletions.push({ model: 'WhatsAppTourPackage', count: result.count });
      console.log(`   ✅ Deleted ${result.count} tour packages`);
    }

    // 14. Delete catalog
    if (counts.whatsAppCatalog > 0) {
      const result = await prisma.whatsAppCatalog.deleteMany({});
      deletions.push({ model: 'WhatsAppCatalog', count: result.count });
      console.log(`   ✅ Deleted ${result.count} catalogs`);
    }

    // 15. Delete media assets
    if (counts.whatsAppMediaAsset > 0) {
      const result = await prisma.whatsAppMediaAsset.deleteMany({});
      deletions.push({ model: 'WhatsAppMediaAsset', count: result.count });
      console.log(`   ✅ Deleted ${result.count} media assets`);
    }

    // 16. Delete templates
    if (counts.whatsAppTemplate > 0) {
      const result = await prisma.whatsAppTemplate.deleteMany({});
      deletions.push({ model: 'WhatsAppTemplate', count: result.count });
      console.log(`   ✅ Deleted ${result.count} templates`);
    }

    // 17. Delete sessions
    if (counts.whatsAppSession > 0) {
      const result = await prisma.whatsAppSession.deleteMany({});
      deletions.push({ model: 'WhatsAppSession', count: result.count });
      console.log(`   ✅ Deleted ${result.count} sessions`);
    }

    // 18. Delete flow versions
    if (counts.whatsAppFlowVersion > 0) {
      const result = await prisma.whatsAppFlowVersion.deleteMany({});
      deletions.push({ model: 'WhatsAppFlowVersion', count: result.count });
      console.log(`   ✅ Deleted ${result.count} flow versions`);
    }

    // 19. Delete automations
    if (counts.whatsAppAutomation > 0) {
      const result = await prisma.whatsAppAutomation.deleteMany({});
      deletions.push({ model: 'WhatsAppAutomation', count: result.count });
      console.log(`   ✅ Deleted ${result.count} automations`);
    }

    console.log('\n✅ Cleanup completed successfully!');
    console.log('\n📊 Summary:');
    const totalDeleted = deletions.reduce((sum, d) => sum + d.count, 0);
    console.log(`   Total records deleted: ${totalDeleted}`);
    console.log(`   Models cleaned: ${deletions.length}`);

    console.log('\n💡 Next steps:');
    console.log('   1. ✅ WhatsApp data now only exists in PostgreSQL');
    console.log('   2. 📝 Consider removing WhatsApp models from schema.prisma (optional)');
    console.log('   3. 🚀 App continues to use PostgreSQL for all WhatsApp operations');
    console.log('   4. 📊 MySQL database space has been freed up');

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    console.error('\n⚠️  Some data may have been deleted. Check your database state.');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run cleanup
cleanupWhatsAppData()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
