/**
 * Export WhatsApp Data from MySQL
 * 
 * This script exports all WhatsApp-related data from the current MySQL database
 * to JSON files, ready for import into PostgreSQL.
 * 
 * Usage: node scripts/migration/export-whatsapp-data.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

const WHATSAPP_MODELS = [
  'WhatsAppMessage',
  'WhatsAppSession',
  'WhatsAppAutomation',
  'WhatsAppAnalyticsEvent',
  'WhatsAppTemplate',
  'WhatsAppFlowVersion',
  'WhatsAppCampaign',
  'WhatsAppCampaignRecipient',
  'WhatsAppCustomer',
  'WhatsAppCatalog',
  'WhatsAppMediaAsset',
  'WhatsAppProduct',
  'WhatsAppProductVariant',
  'WhatsAppTourPackage',
  'WhatsAppTourPackageVariant',
  'WhatsAppCart',
  'WhatsAppCartItem',
  'WhatsAppOrder',
  'WhatsAppOrderItem',
];

async function exportData() {
  console.log('🚀 Starting WhatsApp data export from MySQL...\n');

  const exportDir = path.join(__dirname, '../../tmp/whatsapp-migration');
  await fs.mkdir(exportDir, { recursive: true });

  const summary = {
    exportedAt: new Date().toISOString(),
    totalRecords: 0,
    models: {},
  };

  for (const modelName of WHATSAPP_MODELS) {
    try {
      console.log(`📦 Exporting ${modelName}...`);

      // Get the model from Prisma client
      const model = prisma[modelName.charAt(0).toLowerCase() + modelName.slice(1)];
      
      if (!model) {
        console.log(`   ⚠️  Model ${modelName} not found in Prisma client, skipping`);
        continue;
      }

      // Fetch all records
      const records = await model.findMany();
      
      console.log(`   ✅ Found ${records.length} records`);

      // Save to JSON file
      const fileName = `${modelName}.json`;
      const filePath = path.join(exportDir, fileName);
      
      await fs.writeFile(
        filePath,
        JSON.stringify(records, null, 2),
        'utf-8'
      );

      summary.models[modelName] = {
        count: records.length,
        file: fileName,
      };

      summary.totalRecords += records.length;

    } catch (error) {
      console.error(`   ❌ Error exporting ${modelName}:`, error.message);
      summary.models[modelName] = {
        count: 0,
        error: error.message,
      };
    }
  }

  // Save summary
  await fs.writeFile(
    path.join(exportDir, 'export-summary.json'),
    JSON.stringify(summary, null, 2),
    'utf-8'
  );

  console.log(`\n✅ Export complete!`);
  console.log(`📊 Total records exported: ${summary.totalRecords}`);
  console.log(`📁 Data saved to: ${exportDir}`);
  console.log(`\n📋 Summary by model:`);
  
  Object.entries(summary.models).forEach(([model, data]) => {
    if (data.error) {
      console.log(`   ❌ ${model}: ERROR - ${data.error}`);
    } else {
      console.log(`   ✅ ${model}: ${data.count} records`);
    }
  });

  await prisma.$disconnect();
}

exportData()
  .then(() => {
    console.log('\n🎉 Export completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Export failed:', error);
    process.exit(1);
  });
