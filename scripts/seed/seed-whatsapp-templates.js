// Seed script to add default WhatsApp templates
// Run with: node seed-whatsapp-templates.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const defaultTemplates = [
  {
    name: 'Welcome Message',
    body: 'Hello {{name}}! Welcome to {{company}}. We\'re excited to have you on board.',
    variables: ['name', 'company']
  },
  {
    name: 'Order Confirmation',
    body: 'Hi {{name}}, your order #{{orderNumber}} has been confirmed. Total amount: {{amount}}. Thank you for your purchase!',
    variables: ['name', 'orderNumber', 'amount']
  },
  {
    name: 'Tour Package Inquiry',
    body: 'Hello {{name}}, thank you for your interest in our {{packageName}} tour package. Our team will contact you shortly to discuss the details.',
    variables: ['name', 'packageName']
  },
  {
    name: 'Payment Reminder',
    body: 'Dear {{name}}, this is a friendly reminder that your payment of {{amount}} for {{service}} is due on {{dueDate}}.',
    variables: ['name', 'amount', 'service', 'dueDate']
  },
  {
    name: 'Meeting Reminder',
    body: 'Hi {{name}}, this is a reminder about our meeting scheduled for {{date}} at {{time}}. Looking forward to speaking with you!',
    variables: ['name', 'date', 'time']
  },
  {
    name: 'Custom Promotion',
    body: 'Special offer for {{name}}! Get {{discount}}% off on {{product}}. Use code {{promoCode}} before {{expiryDate}}. Don\'t miss out!',
    variables: ['name', 'discount', 'product', 'promoCode', 'expiryDate']
  }
];

async function seedTemplates() {
  console.log('🌱 Seeding WhatsApp templates...');

  try {
    for (const template of defaultTemplates) {
      const existing = await prisma.whatsAppTemplate.findUnique({
        where: { name: template.name }
      });

      if (!existing) {
        await prisma.whatsAppTemplate.create({
          data: template
        });
        console.log(`✅ Created template: ${template.name}`);
      } else {
        console.log(`⏭️  Template already exists: ${template.name}`);
      }
    }

    console.log('\n🎉 Template seeding completed!');
    
    // Show all templates
    const allTemplates = await prisma.whatsAppTemplate.findMany();
    console.log(`\n📝 Total templates in database: ${allTemplates.length}`);
    
  } catch (error) {
    console.error('❌ Error seeding templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTemplates();
