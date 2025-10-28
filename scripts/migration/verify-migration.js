/**
 * Verify WhatsApp Migration
 * 
 * Compares record counts and sample data between MySQL and PostgreSQL
 * to ensure migration was successful.
 * 
 * Usage: node scripts/migration/verify-migration.js
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaClient: WhatsAppPrismaClient } = require('@prisma/whatsapp-client');

const mysqlPrisma = new PrismaClient();
const postgresPrisma = new WhatsAppPrismaClient();

const MODELS_TO_VERIFY = [
  'whatsAppMessage',
  'whatsAppSession',
  'whatsAppAutomation',
  'whatsAppAnalyticsEvent',
  'whatsAppTemplate',
  'whatsAppFlowVersion',
  'whatsAppCampaign',
  'whatsAppCampaignRecipient',
  'whatsAppCustomer',
  'whatsAppCatalog',
  'whatsAppMediaAsset',
  'whatsAppProduct',
  'whatsAppProductVariant',
  'whatsAppTourPackage',
  'whatsAppTourPackageVariant',
  'whatsAppCart',
  'whatsAppCartItem',
  'whatsAppOrder',
  'whatsAppOrderItem',
];

async function verifyMigration() {
  console.log('🔍 Verifying WhatsApp migration...\n');

  const results = {
    verifiedAt: new Date().toISOString(),
    success: true,
    models: {},
    summary: {
      totalModels: 0,
      matchingCounts: 0,
      mismatchedCounts: 0,
      errors: 0,
    },
  };

  for (const modelKey of MODELS_TO_VERIFY) {
    try {
      console.log(`📊 Verifying ${modelKey}...`);

      // Count records in MySQL
      let mysqlCount = 0;
      try {
        mysqlCount = await mysqlPrisma[modelKey].count();
      } catch (error) {
        console.log(`   ⚠️  Model not found in MySQL: ${error.message}`);
        mysqlCount = 0;
      }

      // Count records in PostgreSQL
      const postgresCount = await postgresPrisma[modelKey].count();

      const match = mysqlCount === postgresCount;
      
      if (match) {
        console.log(`   ✅ Counts match: ${mysqlCount} records`);
      } else {
        console.log(`   ❌ Mismatch! MySQL: ${mysqlCount}, PostgreSQL: ${postgresCount}`);
        results.success = false;
      }

      results.models[modelKey] = {
        mysqlCount,
        postgresCount,
        match,
      };

      results.summary.totalModels++;
      if (match) {
        results.summary.matchingCounts++;
      } else {
        results.summary.mismatchedCounts++;
      }

      // Sample data comparison for first 5 records
      if (postgresCount > 0 && mysqlCount > 0) {
        const mysqlSample = await mysqlPrisma[modelKey].findMany({ take: 1 });
        const postgresSample = await postgresPrisma[modelKey].findMany({ take: 1 });

        if (mysqlSample.length > 0 && postgresSample.length > 0) {
          const mysqlIds = mysqlSample.map(r => r.id);
          const postgresIds = postgresSample.map(r => r.id);
          
          const hasMatchingIds = mysqlIds.some(id => postgresIds.includes(id));
          console.log(`   📝 Sample ID check: ${hasMatchingIds ? '✅ Found' : '⚠️  Different'}`);
        }
      }

    } catch (error) {
      console.error(`   ❌ Error verifying ${modelKey}:`, error.message);
      results.models[modelKey] = {
        error: error.message,
      };
      results.summary.errors++;
      results.success = false;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 VERIFICATION SUMMARY`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total models checked: ${results.summary.totalModels}`);
  console.log(`✅ Matching counts: ${results.summary.matchingCounts}`);
  console.log(`❌ Mismatched counts: ${results.summary.mismatchedCounts}`);
  console.log(`⚠️  Errors: ${results.summary.errors}`);
  console.log(`\n${results.success ? '✅ VERIFICATION PASSED!' : '❌ VERIFICATION FAILED!'}`);

  // Calculate total records
  const totalMysql = Object.values(results.models)
    .filter(m => !m.error)
    .reduce((sum, m) => sum + (m.mysqlCount || 0), 0);
  
  const totalPostgres = Object.values(results.models)
    .filter(m => !m.error)
    .reduce((sum, m) => sum + (m.postgresCount || 0), 0);

  console.log(`\nTotal Records:`);
  console.log(`  MySQL: ${totalMysql}`);
  console.log(`  PostgreSQL: ${totalPostgres}`);
  console.log(`  Difference: ${Math.abs(totalMysql - totalPostgres)}`);

  await mysqlPrisma.$disconnect();
  await postgresPrisma.$disconnect();

  return results;
}

verifyMigration()
  .then((results) => {
    if (results.success) {
      console.log('\n🎉 Migration verified successfully!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Migration verification found issues. Please review above.');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n💥 Verification failed:', error);
    process.exit(1);
  });
