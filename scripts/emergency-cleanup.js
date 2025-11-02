const { PrismaClient } = require('@prisma/whatsapp-client');
const prisma = new PrismaClient();

async function emergencyCleanup() {
  try {
    console.log('🚨 EMERGENCY CLEANUP - Clearing stuck recipients\n');
    
    // Get current campaign
    const currentCampaign = await prisma.whatsAppCampaign.findUnique({
      where: { id: '51f580d8-6ac9-4a3b-a9ce-e6bc333fea65' },
      include: {
        _count: { select: { recipients: true } }
      }
    });
    
    console.log(`Current Campaign: ${currentCampaign.name}`);
    console.log(`Total Recipients: ${currentCampaign._count.recipients}`);
    console.log(`Status: ${currentCampaign.status}\n`);
    
    // Delete recipients in batches to avoid table lock
    console.log('Deleting recipients in small batches...\n');
    
    let totalDeleted = 0;
    let batchNum = 1;
    
    while (true) {
      // Delete in batches of 50
      const toDelete = await prisma.whatsAppCampaignRecipient.findMany({
        where: { 
          campaignId: '51f580d8-6ac9-4a3b-a9ce-e6bc333fea65',
          status: { in: ['pending', 'retry', 'sending'] }
        },
        take: 50,
        select: { id: true }
      });
      
      if (toDelete.length === 0) break;
      
      const deleted = await prisma.$transaction(
        toDelete.map(recipient =>
          prisma.whatsAppCampaignRecipient.delete({
            where: { id: recipient.id }
          })
        )
      );
      
      totalDeleted += deleted.length;
      console.log(`Batch ${batchNum}: Deleted ${deleted.length} recipients (Total: ${totalDeleted})`);
      batchNum++;
      
      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n✅ Cleanup complete! Deleted ${totalDeleted} stuck recipients.`);
    
    // Update campaign status
    await prisma.whatsAppCampaign.update({
      where: { id: '51f580d8-6ac9-4a3b-a9ce-e6bc333fea65' },
      data: { status: 'cancelled' }
    });
    
    console.log('✅ Campaign marked as cancelled\n');
    
    // Show final stats
    const remaining = await prisma.whatsAppCampaignRecipient.count({
      where: { campaignId: '51f580d8-6ac9-4a3b-a9ce-e6bc333fea65' }
    });
    
    console.log(`📊 Remaining recipients for this campaign: ${remaining}`);
    
    const totalInDb = await prisma.whatsAppCampaignRecipient.count();
    console.log(`📊 Total recipients in database: ${totalInDb}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

emergencyCleanup();
