const { PrismaClient } = require('@prisma/whatsapp-client');
const prisma = new PrismaClient();

async function checkTags() {
  try {
    const customers = await prisma.whatsAppCustomer.findMany({
      where: { isOptedIn: true },
      select: {
        firstName: true,
        lastName: true,
        phoneNumber: true,
        tags: true
      }
    });
    
    console.log(`📊 Total opted-in WhatsApp customers: ${customers.length}\n`);
    
    // Collect all tags
    const tagCounts = new Map();
    customers.forEach(customer => {
      const tags = customer.tags;
      if (Array.isArray(tags)) {
        tags.forEach(tag => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      }
    });
    
    console.log('📋 Available tags:');
    if (tagCounts.size === 0) {
      console.log('  No tags found\n');
    } else {
      Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([tag, count]) => {
          console.log(`  - "${tag}": ${count} customers`);
        });
      console.log();
    }
    
    // Show first 10 customers
    console.log('Sample customers:');
    customers.slice(0, 10).forEach((c, i) => {
      const tags = Array.isArray(c.tags) ? c.tags.join(', ') : 'No tags';
      console.log(`  ${i + 1}. ${c.firstName} ${c.lastName || ''} - ${c.phoneNumber} [${tags}]`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTags();
