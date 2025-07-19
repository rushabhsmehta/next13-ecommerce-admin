/**
 * Reset WhatsApp Data Script
 * This will clear all WhatsApp-related data and reset the schema
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetWhatsAppData() {
  console.log('🧹 === WHATSAPP DATA RESET START ===');
  
  try {
    // Check current data
    console.log('\n📊 Current Data Count:');
    
    const messageCount = await prisma.whatsAppMessage.count();
    console.log(`WhatsApp Messages: ${messageCount}`);
    
    // Clear WhatsApp messages
    console.log('\n🗑️ Clearing WhatsApp Messages...');
    const deletedMessages = await prisma.whatsAppMessage.deleteMany({});
    console.log(`✅ Deleted ${deletedMessages.count} WhatsApp messages`);
    
    // Reset auto-increment (if needed)
    console.log('\n🔄 Resetting sequences...');
    
    // For MySQL, reset auto-increment
    await prisma.$executeRaw`ALTER TABLE WhatsAppMessage AUTO_INCREMENT = 1`;
    console.log('✅ Reset WhatsAppMessage auto-increment');
    
    console.log('\n✅ WhatsApp data reset completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- WhatsApp messages: Cleared');
    console.log('- Schema: Reset');
    console.log('- Ready for fresh testing');
    
  } catch (error) {
    console.error('\n❌ Error during reset:', error);
    
    if (error.message.includes('Table') && error.message.includes('doesn\'t exist')) {
      console.log('\n💡 The WhatsAppMessage table might not exist yet.');
      console.log('This is normal for fresh setups. Running Prisma migration...');
      
      // Try to run migration
      const { exec } = require('child_process');
      exec('npx prisma db push', (err, stdout, stderr) => {
        if (err) {
          console.error('Migration error:', err);
        } else {
          console.log('Migration output:', stdout);
        }
      });
    }
  } finally {
    await prisma.$disconnect();
    console.log('\n🔍 === WHATSAPP DATA RESET END ===');
  }
}

// Run the reset
resetWhatsAppData().catch(console.error);
