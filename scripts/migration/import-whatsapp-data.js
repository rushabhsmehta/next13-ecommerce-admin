/**
 * Import WhatsApp Data to PostgreSQL
 * 
 * This script imports WhatsApp data from JSON files (exported from MySQL)
 * into the new PostgreSQL database.
 * 
 * IMPORTANT: Run this AFTER generating the WhatsApp Prisma client:
 * npx prisma generate --schema=prisma/whatsapp-schema.prisma
 * 
 * Usage: node scripts/migration/import-whatsapp-data.js
 */

const { PrismaClient } = require('@prisma/whatsapp-client');
const fs = require('fs').promises;
const path = require('path');

const whatsappPrisma = new PrismaClient();

// Import order matters due to foreign key constraints
const IMPORT_ORDER = [
  // Core models (no dependencies)
  'WhatsAppTemplate',
  'WhatsAppFlowVersion',
  'WhatsAppAutomation',
  'WhatsAppCustomer',
  
  // Session-related
  'WhatsAppSession',
  
  // Message-related (depends on Session, Automation, Customer)
  'WhatsAppMessage',
  
  // Analytics (depends on Session, Message, Automation)
  'WhatsAppAnalyticsEvent',
  
  // Campaign models
  'WhatsAppCampaign',
  'WhatsAppCampaignRecipient', // Depends on Campaign, Customer
  
  // Catalog models
  'WhatsAppCatalog',
  'WhatsAppMediaAsset',
  'WhatsAppProduct', // Depends on Catalog
  'WhatsAppProductVariant', // Depends on Product
  'WhatsAppTourPackage', // Depends on Product
  'WhatsAppTourPackageVariant', // Depends on TourPackage, ProductVariant
  
  // Cart & Orders
  'WhatsAppCart',
  'WhatsAppCartItem', // Depends on Cart, Product, ProductVariant
  'WhatsAppOrder', // Depends on Cart
  'WhatsAppOrderItem', // Depends on Order, Product, ProductVariant
];

async function importData() {
  console.log('🚀 Starting WhatsApp data import to PostgreSQL...\n');

  const exportDir = path.join(__dirname, '../../tmp/whatsapp-migration');

  // Check if export directory exists
  try {
    await fs.access(exportDir);
  } catch (error) {
    console.error('❌ Export directory not found!');
    console.error('   Please run export-whatsapp-data.js first');
    process.exit(1);
  }

  const summary = {
    importedAt: new Date().toISOString(),
    totalRecords: 0,
    models: {},
  };

  for (const modelName of IMPORT_ORDER) {
    try {
      console.log(`📦 Importing ${modelName}...`);

      // Read JSON file
      const fileName = `${modelName}.json`;
      const filePath = path.join(exportDir, fileName);

      let records;
      try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        records = JSON.parse(fileContent);
      } catch (error) {
        console.log(`   ⚠️  File ${fileName} not found, skipping`);
        continue;
      }

      if (!records || records.length === 0) {
        console.log(`   ℹ️  No records to import`);
        summary.models[modelName] = { count: 0 };
        continue;
      }

      // Get the model from Prisma client
      const modelKey = modelName.charAt(0).toLowerCase() + modelName.slice(1);
      const model = whatsappPrisma[modelKey];

      if (!model) {
        console.log(`   ⚠️  Model ${modelName} not found in WhatsApp Prisma client, skipping`);
        continue;
      }

      // Transform data for PostgreSQL
      const transformedRecords = records.map(record => {
        const transformed = { ...record };
        
        // Convert MySQL Date to PostgreSQL timestamp
        Object.keys(transformed).forEach(key => {
          if (transformed[key] instanceof Date || 
              (typeof transformed[key] === 'string' && /^\d{4}-\d{2}-\d{2}/.test(transformed[key]))) {
            transformed[key] = new Date(transformed[key]);
          }
        });

        // Handle tags array for WhatsAppCustomer
        if (modelName === 'WhatsAppCustomer') {
          if (transformed.tags) {
            // Convert JSON array to PostgreSQL array
            if (typeof transformed.tags === 'string') {
              try {
                transformed.tags = JSON.parse(transformed.tags);
              } catch {
                transformed.tags = [];
              }
            } else if (!Array.isArray(transformed.tags)) {
              transformed.tags = [];
            }
          } else {
            // Ensure tags field exists as empty array
            transformed.tags = [];
          }
          
          // Remove associatePartnerId if it doesn't exist in the schema relation
          // (it's stored as string reference in PostgreSQL, not foreign key)
        }

        return transformed;
      });

      // Import in batches to avoid memory issues
      const batchSize = 100;
      let imported = 0;

      for (let i = 0; i < transformedRecords.length; i += batchSize) {
        const batch = transformedRecords.slice(i, i + batchSize);
        
        await whatsappPrisma.$transaction(
          batch.map(record => model.create({ data: record }))
        );

        imported += batch.length;
        process.stdout.write(`\r   📥 Imported ${imported}/${transformedRecords.length} records...`);
      }

      console.log(`\n   ✅ Imported ${imported} records`);

      summary.models[modelName] = { count: imported };
      summary.totalRecords += imported;

    } catch (error) {
      console.error(`\n   ❌ Error importing ${modelName}:`, error.message);
      summary.models[modelName] = {
        count: 0,
        error: error.message,
      };
      
      // Continue with other models
    }
  }

  // Save summary
  await fs.writeFile(
    path.join(exportDir, 'import-summary.json'),
    JSON.stringify(summary, null, 2),
    'utf-8'
  );

  console.log(`\n✅ Import complete!`);
  console.log(`📊 Total records imported: ${summary.totalRecords}`);
  console.log(`\n📋 Summary by model:`);
  
  Object.entries(summary.models).forEach(([model, data]) => {
    if (data.error) {
      console.log(`   ❌ ${model}: ERROR - ${data.error}`);
    } else {
      console.log(`   ✅ ${model}: ${data.count} records`);
    }
  });

  await whatsappPrisma.$disconnect();
}

importData()
  .then(() => {
    console.log('\n🎉 Import completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Import failed:', error);
    process.exit(1);
  });
