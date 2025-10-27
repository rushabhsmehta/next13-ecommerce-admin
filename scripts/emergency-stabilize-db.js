const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function emergencyStabilization() {
  try {
    console.log('🚨 EMERGENCY DATABASE STABILIZATION\n');
    console.log('This will aggressively clean ALL non-essential data\n');
    
    // 1. Truncate Analytics (DELETE ALL)
    console.log('1️⃣ Clearing ALL analytics events...');
    try {
      // Use raw SQL to bypass Prisma issues
      await prisma.$executeRaw`TRUNCATE TABLE WhatsAppAnalyticsEvent`;
      console.log('   ✅ Analytics cleared\n');
    } catch (e) {
      console.log('   ⚠️ Could not truncate, trying delete...');
      try {
        await prisma.$executeRaw`DELETE FROM WhatsAppAnalyticsEvent`;
        console.log('   ✅ Analytics deleted\n');
      } catch (e2) {
        console.log('   ❌ Failed:', e2.message, '\n');
      }
    }
    
    // 2. Clear old messages
    console.log('2️⃣ Clearing messages older than 24 hours...');
    try {
      await prisma.$executeRaw`DELETE FROM WhatsAppMessage WHERE createdAt < DATE_SUB(NOW(), INTERVAL 1 DAY)`;
      console.log('   ✅ Old messages cleared\n');
    } catch (e) {
      console.log('   ❌ Failed:', e.message, '\n');
    }
    
    // 3. Clear inactive sessions
    console.log('3️⃣ Clearing inactive sessions...');
    try {
      await prisma.$executeRaw`DELETE FROM WhatsAppSession WHERE updatedAt < DATE_SUB(NOW(), INTERVAL 1 HOUR)`;
      console.log('   ✅ Inactive sessions cleared\n');
    } catch (e) {
      console.log('   ❌ Failed:', e.message, '\n');
    }
    
    // 4. Clear completed campaign recipients
    console.log('4️⃣ Clearing completed campaign recipients...');
    try {
      await prisma.$executeRaw`
        DELETE FROM WhatsAppCampaignRecipient 
        WHERE campaignId IN (
          SELECT id FROM WhatsAppCampaign 
          WHERE status IN ('completed', 'cancelled', 'failed')
        )
      `;
      console.log('   ✅ Old campaign data cleared\n');
    } catch (e) {
      console.log('   ❌ Failed:', e.message, '\n');
    }
    
    // 5. Clear orders
    console.log('5️⃣ Clearing old orders...');
    try {
      await prisma.$executeRaw`DELETE FROM WhatsAppOrderItem`;
      await prisma.$executeRaw`DELETE FROM WhatsAppOrder WHERE createdAt < DATE_SUB(NOW(), INTERVAL 7 DAY)`;
      console.log('   ✅ Old orders cleared\n');
    } catch (e) {
      console.log('   ❌ Failed:', e.message, '\n');
    }
    
    // 6. Clear carts
    console.log('6️⃣ Clearing old carts...');
    try {
      await prisma.$executeRaw`DELETE FROM WhatsAppCartItem`;
      await prisma.$executeRaw`DELETE FROM WhatsAppCart WHERE updatedAt < DATE_SUB(NOW(), INTERVAL 1 DAY)`;
      console.log('   ✅ Old carts cleared\n');
    } catch (e) {
      console.log('   ❌ Failed:', e.message, '\n');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ EMERGENCY STABILIZATION COMPLETE\n');
    console.log('⚠️  CRITICAL: Upgrade Railway NOW or this will happen again!\n');
    console.log('💡 Free tier is NOT suitable for production use.\n');
    
  } catch (error) {
    console.error('❌ Critical Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

emergencyStabilization();
