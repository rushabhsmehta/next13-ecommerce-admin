const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testWhatsAppMessage() {
  try {
    console.log('Testing WhatsApp message creation...');
    
    // Test creating a WhatsApp message
    const testMessage = await prisma.whatsAppMessage.create({
      data: {
        to: 'whatsapp:+919978783238',
        from: 'whatsapp:+919898744701',
        message: 'Test message',
        status: 'sent',
        direction: 'outbound',
      },
    });
    
    console.log('Successfully created WhatsApp message:', testMessage);
    
    // Clean up - delete the test message
    await prisma.whatsAppMessage.delete({
      where: { id: testMessage.id }
    });
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error testing WhatsApp message:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testWhatsAppMessage();
