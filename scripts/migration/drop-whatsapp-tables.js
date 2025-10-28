const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function dropWhatsAppTables() {
  try {
    console.log('🔍 Checking for WhatsApp tables in MySQL database...\n');
    
    // Get all WhatsApp tables
    const tables = await prisma.$queryRaw`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME LIKE 'WhatsApp%'
      ORDER BY TABLE_NAME
    `;
    
    if (tables.length === 0) {
      console.log('✅ No WhatsApp tables found. Database is already clean.');
      return;
    }
    
    console.log(`Found ${tables.length} WhatsApp tables:\n`);
    tables.forEach(table => {
      console.log(`  - ${table.TABLE_NAME}`);
    });
    
    // Verify all tables are empty before dropping
    console.log('\n🔍 Verifying all tables are empty...\n');
    let hasData = false;
    
    for (const table of tables) {
      const result = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as count FROM \`${table.TABLE_NAME}\``
      );
      const count = result[0].count;
      
      if (count > 0) {
        console.log(`⚠️  ${table.TABLE_NAME}: ${count} rows (NOT EMPTY!)`);
        hasData = true;
      } else {
        console.log(`✓ ${table.TABLE_NAME}: 0 rows`);
      }
    }
    
    if (hasData) {
      console.log('\n❌ ABORT: Some tables contain data. Please migrate data first!');
      console.log('Run the export and import scripts before dropping tables.');
      return;
    }
    
    console.log('\n✅ All tables are empty. Safe to drop.\n');
    console.log('🗑️  Dropping WhatsApp tables...\n');
    
    // Disable foreign key checks temporarily
    await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 0`;
    
    // Drop each table
    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`${table.TABLE_NAME}\``);
        console.log(`✓ Dropped ${table.TABLE_NAME}`);
      } catch (error) {
        console.error(`✗ Failed to drop ${table.TABLE_NAME}:`, error.message);
      }
    }
    
    // Re-enable foreign key checks
    await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 1`;
    
    console.log('\n✅ Successfully dropped all WhatsApp tables from MySQL database!');
    console.log('\nℹ️  WhatsApp data is now exclusively in PostgreSQL.');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
console.log('=== DROP WHATSAPP TABLES FROM MYSQL ===\n');
console.log('This will permanently remove WhatsApp table structures from MySQL.');
console.log('(Data should already be migrated to PostgreSQL)\n');

dropWhatsAppTables()
  .then(() => {
    console.log('\n✅ Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
