const { PrismaClient } = require('@prisma/whatsapp-client');
const prisma = new PrismaClient();

/**
 * Auto-cleanup job to prevent table from filling up
 * Run this periodically (daily/weekly) via cron or manually
 */
async function autoCleanup() {
  try {
    console.log('🤖 Auto-Cleanup Job Starting...\n');
    
    const DAYS_TO_KEEP = 7; // Keep data for 7 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_KEEP);
    
    // 1. Delete recipients from completed campaigns older than X days
    const oldCampaigns = await prisma.whatsAppCampaign.findMany({
      where: {
        status: { in: ['completed', 'cancelled', 'failed'] },
        completedAt: { lt: cutoffDate }
      },
      select: { id: true, name: true, completedAt: true }
    });
    
    if (oldCampaigns.length > 0) {
      console.log(`📧 Found ${oldCampaigns.length} old campaigns to clean:\n`);
      
      let totalRecip = 0;
      for (const campaign of oldCampaigns) {
        const count = await prisma.whatsAppCampaignRecipient.count({
          where: { campaignId: campaign.id }
        });
        
        await prisma.whatsAppCampaignRecipient.deleteMany({
          where: { campaignId: campaign.id }
        });
        
        console.log(`  ✅ ${campaign.name}: ${count} recipients deleted`);
        totalRecip += count;
      }
      
      console.log(`\n📊 Total recipients deleted: ${totalRecip}\n`);
    } else {
      console.log('✅ No old campaigns to clean\n');
    }
    
    // 2. Show current stats
    const totalRecipients = await prisma.whatsAppCampaignRecipient.count();
    const totalCampaigns = await prisma.whatsAppCampaign.count();
    const activeCampaigns = await prisma.whatsAppCampaign.count({
      where: { status: { in: ['draft', 'scheduled', 'sending', 'paused'] } }
    });
    
    console.log('📈 Current Database Stats:');
    console.log(`  Total Recipients: ${totalRecipients}`);
    console.log(`  Total Campaigns: ${totalCampaigns}`);
    console.log(`  Active Campaigns: ${activeCampaigns}`);
    
    // 3. Warning if getting full
    if (totalRecipients > 500) {
      console.log('\n⚠️  WARNING: Database has >500 recipients. Consider cleanup or upgrade.');
    }
    
    console.log('\n✅ Auto-cleanup complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

autoCleanup();
