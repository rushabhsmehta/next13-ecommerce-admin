const { PrismaClient } = require('@prisma/whatsapp-client');
const prisma = new PrismaClient();

async function comprehensiveCleanup() {
  try {
    console.log('🚨 COMPREHENSIVE DATABASE CLEANUP\n');
    console.log('=' .repeat(50) + '\n');
    
    // 1. Campaign Recipients
    console.log('📧 Campaign Recipients:');
    const totalRecipients = await prisma.whatsAppCampaignRecipient.count();
    console.log(`   Total: ${totalRecipients}`);
    
    // Delete old completed campaign recipients
    const oldCampaigns = await prisma.whatsAppCampaign.findMany({
      where: {
        status: { in: ['completed', 'cancelled', 'failed'] }
      },
      select: { id: true, name: true, status: true, completedAt: true }
    });
    
    for (const campaign of oldCampaigns) {
      const count = await prisma.whatsAppCampaignRecipient.deleteMany({
        where: { campaignId: campaign.id }
      });
      console.log(`   ✅ Deleted ${count.count} recipients from "${campaign.name}" (${campaign.status})`);
    }
    
    const remainingRecipients = await prisma.whatsAppCampaignRecipient.count();
    console.log(`   Remaining: ${remainingRecipients}\n`);
    
    // 2. WhatsApp Messages
    console.log('💬 WhatsApp Messages:');
    const totalMessages = await prisma.whatsAppMessage.count();
    console.log(`   Total: ${totalMessages}`);
    
    // Keep only last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const deletedMessages = await prisma.whatsAppMessage.deleteMany({
      where: {
        createdAt: { lt: sevenDaysAgo }
      }
    });
    console.log(`   ✅ Deleted ${deletedMessages.count} messages older than 7 days`);
    
    const remainingMessages = await prisma.whatsAppMessage.count();
    console.log(`   Remaining: ${remainingMessages}\n`);
    
    // 3. WhatsApp Sessions
    console.log('🔐 WhatsApp Sessions:');
    const totalSessions = await prisma.whatsAppSession.count();
    console.log(`   Total: ${totalSessions}`);
    
    // Keep only active sessions (updated in last 2 hours)
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
    
    const deletedSessions = await prisma.whatsAppSession.deleteMany({
      where: {
        updatedAt: { lt: twoHoursAgo }
      }
    });
    console.log(`   ✅ Deleted ${deletedSessions.count} inactive sessions (>2 hours old)`);
    
    const remainingSessions = await prisma.whatsAppSession.count();
    console.log(`   Remaining: ${remainingSessions}\n`);
    
    // 4. Analytics Events
    console.log('📊 Analytics Events:');
    const totalEvents = await prisma.whatsAppAnalyticsEvent.count();
    console.log(`   Total: ${totalEvents}`);
    
    const deletedEvents = await prisma.whatsAppAnalyticsEvent.deleteMany({
      where: {
        createdAt: { lt: sevenDaysAgo }
      }
    });
    console.log(`   ✅ Deleted ${deletedEvents.count} events older than 7 days`);
    
    const remainingEvents = await prisma.whatsAppAnalyticsEvent.count();
    console.log(`   Remaining: ${remainingEvents}\n`);
    
    // 5. Orders (if any)
    console.log('🛒 WhatsApp Orders:');
    const totalOrders = await prisma.whatsAppOrder.count();
    console.log(`   Total: ${totalOrders}`);
    
    const deletedOrders = await prisma.whatsAppOrder.deleteMany({
      where: {
        createdAt: { lt: sevenDaysAgo }
      }
    });
    console.log(`   ✅ Deleted ${deletedOrders.count} orders older than 7 days`);
    
    const remainingOrders = await prisma.whatsAppOrder.count();
    console.log(`   Remaining: ${remainingOrders}\n`);
    
    console.log('=' .repeat(50));
    console.log('✅ CLEANUP COMPLETE!\n');
    console.log('💡 Recommendation: Upgrade to Railway Hobby plan ($5/month) for more storage\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

comprehensiveCleanup();
