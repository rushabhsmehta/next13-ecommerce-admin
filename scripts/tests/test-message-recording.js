const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testMessageRecording() {
  console.log('Testing WhatsApp message recording...');
  
  try {
    // Test creating a message
    const testMessage = await prisma.whatsAppMessage.create({
      data: {
        messageId: 'test-' + Date.now(),
        messageSid: 'SM' + Date.now(),
        fromNumber: 'whatsapp:+919898744701',
        toNumber: 'whatsapp:+919978783238',
        message: 'Test message for recording',
        status: 'sent',
        direction: 'outgoing',
        timestamp: new Date(),
        contentSid: 'HX526a2b82fdd37c7fa7debc285880b17c',
        templateName: 'welcome_message'
      }
    });
    
    console.log('✅ Test message created:', testMessage);
    
    // Fetch recent messages
    const recentMessages = await prisma.whatsAppMessage.findMany({
      orderBy: { timestamp: 'desc' },
      take: 5
    });
    
    console.log('📋 Recent messages:', recentMessages);
    
    // Clean up test message
    await prisma.whatsAppMessage.delete({
      where: { id: testMessage.id }
    });
    
    console.log('✅ Test message cleaned up');
    
  } catch (error) {
    console.error('❌ Error testing message recording:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMessageRecording();
