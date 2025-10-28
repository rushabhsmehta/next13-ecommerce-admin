/**
 * Update Application Code to Use WhatsApp PostgreSQL Client
 * 
 * This script automatically updates all WhatsApp-related files to use
 * the new PostgreSQL client instead of the MySQL client.
 * 
 * Usage: node scripts/migration/update-imports.js
 */

const fs = require('fs').promises;
const path = require('path');

// Files that need to be updated to use WhatsApp PostgreSQL client
const FILES_TO_UPDATE = [
  // Core WhatsApp library
  'src/lib/whatsapp.ts',
  
  // WhatsApp API routes that use prismadb directly
  'src/app/api/whatsapp/database-health/route.ts',
  'src/app/api/whatsapp/templates/route.ts',
  'src/app/api/whatsapp/flow-endpoint/route.ts',
];

async function updateImports() {
  console.log('🔄 Updating WhatsApp files to use PostgreSQL client...\n');

  let updatedCount = 0;
  let errorCount = 0;

  for (const relativeFilePath of FILES_TO_UPDATE) {
    try {
      const filePath = path.join(__dirname, '../../', relativeFilePath);
      
      console.log(`📝 Updating ${relativeFilePath}...`);

      // Read file content
      let content = await fs.readFile(filePath, 'utf-8');
      
      // Track if any changes were made
      let changed = false;

      // Replace import statements
      if (content.includes("import prisma from './prismadb'")) {
        content = content.replace(
          "import prisma from './prismadb'",
          "import prisma from './whatsapp-prismadb'"
        );
        changed = true;
        console.log(`   ✅ Updated: import prisma from './prismadb' → './whatsapp-prismadb'`);
      }

      if (content.includes('import prismadb from "@/lib/prismadb"')) {
        content = content.replace(
          'import prismadb from "@/lib/prismadb"',
          'import whatsappPrisma from "@/lib/whatsapp-prismadb"'
        );
        // Also replace usage of prismadb → whatsappPrisma
        content = content.replace(/\bprismadb\./g, 'whatsappPrisma.');
        changed = true;
        console.log(`   ✅ Updated: prismadb → whatsappPrisma`);
      }

      if (content.includes("import prismadb from '@/lib/prismadb'")) {
        content = content.replace(
          "import prismadb from '@/lib/prismadb'",
          "import whatsappPrisma from '@/lib/whatsapp-prismadb'"
        );
        content = content.replace(/\bprismadb\./g, 'whatsappPrisma.');
        changed = true;
        console.log(`   ✅ Updated: prismadb → whatsappPrisma`);
      }

      if (changed) {
        await fs.writeFile(filePath, content, 'utf-8');
        console.log(`   💾 Saved changes\n`);
        updatedCount++;
      } else {
        console.log(`   ℹ️  No changes needed\n`);
      }

    } catch (error) {
      console.error(`   ❌ Error updating ${relativeFilePath}:`, error.message);
      errorCount++;
    }
  }

  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Updated ${updatedCount} files`);
  if (errorCount > 0) {
    console.log(`❌ Errors: ${errorCount}`);
  }
  console.log(`${'='.repeat(60)}\n`);
}

updateImports()
  .then(() => {
    console.log('🎉 Import updates complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Run: npm run build');
    console.log('2. Test locally: npm run dev');
    console.log('3. Deploy: git push\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Update failed:', error);
    process.exit(1);
  });
