const { PrismaClient } = require('@prisma/whatsapp-client');
const prisma = new PrismaClient();

async function cleanupOldRecipients() {
  try {
    console.log('🧹 Starting cleanup of old campaign recipients...\n');
    
    // Find completed campaigns older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const oldCompletedCampaigns = await prisma.whatsAppCampaign.findMany({
      where: {
        status: 'completed',
        completedAt: {
          lt: sevenDaysAgo
        }
      },
      select: {
        id: true,
        name: true,
        completedAt: true,
        _count: {
          select: { recipients: true }
        }
      }
    });
    
    if (oldCompletedCampaigns.length === 0) {
      console.log('✅ No old completed campaigns found (older than 7 days)');
      
      // Check all completed campaigns
      const allCompleted = await prisma.whatsAppCampaign.findMany({
        where: { status: 'completed' },
        select: {
          id: true,
          name: true,
          completedAt: true,
          _count: { select: { recipients: true } }
        }
      });
      
      console.log('\n📋 All completed campaigns:');
      allCompleted.forEach(camp => {
        console.log(`  - ${camp.name}: ${camp._count.recipients} recipients (completed ${camp.completedAt?.toLocaleDateString()})`);
      });
      
      return;
    }
    
    console.log(`Found ${oldCompletedCampaigns.length} old completed campaign(s):\n`);
    
    let totalDeleted = 0;
    for (const campaign of oldCompletedCampaigns) {
      console.log(`📧 ${campaign.name}`);
      console.log(`   Completed: ${campaign.completedAt?.toLocaleDateString()}`);
      console.log(`   Recipients: ${campaign._count.recipients}`);
      
      // Delete recipients
      const deleted = await prisma.whatsAppCampaignRecipient.deleteMany({
        where: { campaignId: campaign.id }
      });
      
      console.log(`   ✅ Deleted ${deleted.count} recipients\n`);
      totalDeleted += deleted.count;
    }
    
    console.log(`\n🎉 Cleanup complete! Deleted ${totalDeleted} old recipient records.`);
    
    // Show current stats
    const remainingCount = await prisma.whatsAppCampaignRecipient.count();
    console.log(`📊 Remaining recipients in database: ${remainingCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupOldRecipients();
