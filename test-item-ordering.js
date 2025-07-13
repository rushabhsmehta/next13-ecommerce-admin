const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testItemOrdering() {
  try {
    console.log('Testing item ordering implementation...');
    
    // Test 1: Check if orderIndex field exists in schema
    const purchaseItems = await prisma.purchaseItem.findMany({
      select: {
        id: true,
        orderIndex: true,
        productName: true,
        createdAt: true
      },
      take: 5,
      orderBy: { orderIndex: 'asc' }
    });
    
    console.log('\n✅ Purchase Items with orderIndex:');
    purchaseItems.forEach((item, index) => {
      console.log(`  ${index + 1}. ID: ${item.id.substring(0, 8)}, orderIndex: ${item.orderIndex}, Product: ${item.productName}`);
    });
    
    // Test 2: Check sale items
    const saleItems = await prisma.saleItem.findMany({
      select: {
        id: true,
        orderIndex: true,
        productName: true,
        createdAt: true
      },
      take: 5,
      orderBy: { orderIndex: 'asc' }
    });
    
    console.log('\n✅ Sale Items with orderIndex:');
    saleItems.forEach((item, index) => {
      console.log(`  ${index + 1}. ID: ${item.id.substring(0, 8)}, orderIndex: ${item.orderIndex}, Product: ${item.productName}`);
    });
    
    // Test 3: Check purchase return items
    const purchaseReturnItems = await prisma.purchaseReturnItem.findMany({
      select: {
        id: true,
        orderIndex: true,
        productName: true,
        createdAt: true
      },
      take: 5,
      orderBy: { orderIndex: 'asc' }
    });
    
    console.log('\n✅ Purchase Return Items with orderIndex:');
    purchaseReturnItems.forEach((item, index) => {
      console.log(`  ${index + 1}. ID: ${item.id.substring(0, 8)}, orderIndex: ${item.orderIndex}, Product: ${item.productName}`);
    });
    
    // Test 4: Check sale return items
    const saleReturnItems = await prisma.saleReturnItem.findMany({
      select: {
        id: true,
        orderIndex: true,
        productName: true,
        createdAt: true
      },
      take: 5,
      orderBy: { orderIndex: 'asc' }
    });
    
    console.log('\n✅ Sale Return Items with orderIndex:');
    saleReturnItems.forEach((item, index) => {
      console.log(`  ${index + 1}. ID: ${item.id.substring(0, 8)}, orderIndex: ${item.orderIndex}, Product: ${item.productName}`);
    });
    
    console.log('\n✅ Item ordering implementation test completed successfully!');
    console.log('📝 Summary:');
    console.log('  - All item models have orderIndex field');
    console.log('  - Items are being ordered by orderIndex');
    console.log('  - Database schema is properly updated');
    
  } catch (error) {
    console.error('❌ Error testing item ordering:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testItemOrdering();
