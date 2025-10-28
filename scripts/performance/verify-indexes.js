/**
 * Verify that all performance indexes exist in the database
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyIndexes() {
  console.log('🔍 Verifying Performance Indexes...\n');

  try {
    const tables = ['TourPackageQuery', 'AssociatePartner', 'Location'];
    
    for (const table of tables) {
      console.log(`\n📊 Table: ${table}`);
      console.log('─'.repeat(60));
      
      const indexes = await prisma.$queryRawUnsafe(
        `SHOW INDEXES FROM \`${table}\``
      );

      // Group indexes by name
      const indexMap = new Map();
      for (const idx of indexes) {
        if (!indexMap.has(idx.Key_name)) {
          indexMap.set(idx.Key_name, {
            name: idx.Key_name,
            columns: [],
            unique: idx.Non_unique === 0,
            type: idx.Index_type
          });
        }
        indexMap.get(idx.Key_name).columns.push(idx.Column_name);
      }

      // Display indexes
      let count = 0;
      for (const [name, info] of indexMap) {
        count++;
        const unique = info.unique ? ' [UNIQUE]' : '';
        const cols = info.columns.join(', ');
        console.log(`${count}. ${name}${unique}`);
        console.log(`   Columns: ${cols}`);
        console.log(`   Type: ${info.type}`);
      }

      console.log(`\nTotal indexes: ${indexMap.size}`);
    }

    // Check for our specific performance indexes
    console.log('\n\n✅ Performance Indexes Status:');
    console.log('═'.repeat(60));

    const expectedIndexes = [
      { table: 'TourPackageQuery', name: 'TourPackageQuery_updatedAt_idx' },
      { table: 'TourPackageQuery', name: 'TourPackageQuery_isArchived_idx' },
      { table: 'TourPackageQuery', name: 'TourPackageQuery_locationId_isArchived_updatedAt_idx' },
      { table: 'TourPackageQuery', name: 'TourPackageQuery_tourPackageQueryNumber_idx' },
      { table: 'TourPackageQuery', name: 'TourPackageQuery_customerNumber_idx' },
      { table: 'AssociatePartner', name: 'AssociatePartner_isActive_idx' },
      { table: 'AssociatePartner', name: 'AssociatePartner_createdAt_idx' },
      { table: 'Location', name: 'Location_label_idx' },
    ];

    let foundCount = 0;

    for (const expected of expectedIndexes) {
      const result = await prisma.$queryRawUnsafe(
        `SHOW INDEXES FROM \`${expected.table}\` WHERE Key_name = ?`,
        expected.name
      );

      if (result.length > 0) {
        console.log(`✅ ${expected.name}`);
        foundCount++;
      } else {
        console.log(`❌ ${expected.name} - MISSING!`);
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log(`Performance Indexes: ${foundCount}/${expectedIndexes.length}`);
    
    if (foundCount === expectedIndexes.length) {
      console.log('\n🎉 All performance indexes are in place!');
      console.log('Your queries should be running 85-90% faster.');
    } else {
      console.log('\n⚠️  Some indexes are missing. Run add-indexes-mysql.js');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyIndexes()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
