const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkWhatsAppTables() {
  try {
    // Check if WhatsApp tables exist in MySQL
    const tables = await prisma.$queryRaw`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME LIKE 'WhatsApp%'
    `;
    
    console.log('\n=== WhatsApp Tables in MySQL Database ===');
    console.log('Total WhatsApp tables found:', tables.length);
    
    if (tables.length > 0) {
      console.log('\nTables:');
      tables.forEach(table => {
        console.log('  -', table.TABLE_NAME);
      });
      
      // Check row counts for each table
      console.log('\n=== Row Counts ===');
      for (const table of tables) {
        const result = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*) as count FROM \`${table.TABLE_NAME}\``
        );
        console.log(`  ${table.TABLE_NAME}: ${result[0].count} rows`);
      }
    } else {
      console.log('\n✅ No WhatsApp tables found in MySQL database');
      console.log('All WhatsApp data has been successfully removed from MySQL.');
    }
    
  } catch (error) {
    console.error('Error checking tables:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkWhatsAppTables();
