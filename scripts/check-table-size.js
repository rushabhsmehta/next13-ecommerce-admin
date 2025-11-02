const { PrismaClient } = require('@prisma/whatsapp-client');
const prisma = new PrismaClient();

async function checkTableStats() {
  try {
    // Check total recipients count
    const totalRecipients = await prisma.whatsAppCampaignRecipient.count();
    console.log('📊 Total Recipients in Database:', totalRecipients.toLocaleString());
    
    // Check by status
    const byStatus = await prisma.whatsAppCampaignRecipient.groupBy({
      by: ['status'],
      _count: { _all: true }
    });
    
    console.log('\n📈 Recipients by Status:');
    byStatus.forEach(group => {
      console.log(`  ${group.status}: ${group._count._all.toLocaleString()}`);
    });
    
    // Check oldest and newest
    const oldest = await prisma.whatsAppCampaignRecipient.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, campaignId: true }
    });
    
    const newest = await prisma.whatsAppCampaignRecipient.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, campaignId: true }
    });
    
    console.log('\n📅 Date Range:');
    console.log('  Oldest:', oldest?.createdAt);
    console.log('  Newest:', newest?.createdAt);
    
    // Check campaigns
    const totalCampaigns = await prisma.whatsAppCampaign.count();
    const completedCampaigns = await prisma.whatsAppCampaign.count({
      where: { status: 'completed' }
    });
    
    console.log('\n📧 Campaigns:');
    console.log('  Total:', totalCampaigns);
    console.log('  Completed:', completedCampaigns);
    console.log('  Other:', totalCampaigns - completedCampaigns);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTableStats();
