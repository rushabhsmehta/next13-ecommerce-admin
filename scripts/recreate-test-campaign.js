const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function recreateCampaign() {
  try {
    console.log('🔍 Finding recipients who have NOT received the message...\n');
    
    // Get all phone numbers that already received the message from the old campaign
    const alreadySentRecipients = await prisma.whatsAppCampaignRecipient.findMany({
      where: {
        campaignId: '51f580d8-6ac9-4a3b-a9ce-e6bc333fea65',
        status: { in: ['sent', 'delivered', 'read'] }  // Successfully sent
      },
      select: {
        phoneNumber: true
      }
    });
    
    const alreadySentPhones = new Set(alreadySentRecipients.map(r => r.phoneNumber));
    console.log(`📧 ${alreadySentPhones.size} customers already received the message\n`);
    
    // Get ALL opted-in WhatsApp Customers
    const whatsappCustomers = await prisma.whatsAppCustomer.findMany({
      where: {
        isOptedIn: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        tags: true
      }
    });
    
    // Filter for customers with 'Customer' tag (tags is JSON array)
    const customersWithTag = whatsappCustomers.filter(customer => {
      const tags = customer.tags;
      if (Array.isArray(tags)) {
        return tags.includes('Customer');  // Capital C
      }
      return false;
    });
    
    console.log(`📋 Found ${customersWithTag.length} opted-in customers with 'Customer' tag\n`);
    
    // Filter out customers who already received the message
    const newRecipients = customersWithTag.filter(customer => 
      !alreadySentPhones.has(customer.phoneNumber)
    );
    
    console.log(`✅ ${newRecipients.length} NEW recipients (haven't received message yet)\n`);
    
    if (newRecipients.length === 0) {
      console.log('❌ All customers with "customer" tag have already received the message!');
      console.log('\nOptions:');
      console.log('1. Use different tag filter');
      console.log('2. Add new customers to WhatsApp directory');
      console.log('3. Manually create campaign via UI\n');
      return;
    }
    
    // Show sample
    console.log('Sample new recipients:');
    newRecipients.slice(0, 10).forEach((customer, i) => {
      console.log(`  ${i + 1}. ${customer.firstName} ${customer.lastName || ''} - ${customer.phoneNumber}`);
    });
    if (newRecipients.length > 10) {
      console.log(`  ... and ${newRecipients.length - 10} more`);
    }
    console.log();
    
    // Create new campaign with only new recipients
    console.log('Creating new campaign with ONLY new recipients...\n');
    
    const campaign = await prisma.whatsAppCampaign.create({
      data: {
        name: 'Find Interest - New Recipients Only',
        description: 'Sending to customers who have NOT received the previous message',
        templateName: 'find_interestt',
        templateLanguage: 'en',
        status: 'draft',
        targetType: 'manual',
        rateLimit: 4800,  // 80 msg/sec (optimized)
        retryFailed: true,
        maxRetries: 3,
        totalRecipients: newRecipients.length,
        recipients: {
          create: newRecipients.map(customer => ({
            phoneNumber: customer.phoneNumber,
            name: `${customer.firstName} ${customer.lastName || ''}`.trim(),
            whatsappCustomerId: customer.id,
            status: 'pending',
            variables: {}  // Template has no variables
          }))
        }
      }
    });
    
    console.log('✅ Campaign created successfully!');
    console.log(`   ID: ${campaign.id}`);
    console.log(`   Name: ${campaign.name}`);
    console.log(`   Recipients: ${newRecipients.length} (NEW only)`);
    console.log(`   Rate: 4800/min (80 msg/sec)`);
    console.log(`   Skipped: ${alreadySentPhones.size} (already received)`);
    console.log(`\n🔗 View at: https://admin.aagamholidays.com/whatsapp/campaigns/${campaign.id}`);
    console.log('\n📌 Go to the campaign page and click "Send Campaign" to start!\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

recreateCampaign();
