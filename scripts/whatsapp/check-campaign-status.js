/**
 * Script to check campaign status and identify why it stopped
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function checkCampaignStatus() {
  try {
    // Get the most recent campaign that's in "sending" status
    const campaigns = await prisma.whatsAppCampaign.findMany({
      where: {
        status: 'sending'
      },
      orderBy: {
        startedAt: 'desc'
      },
      take: 5,
      select: {
        id: true,
        name: true,
        status: true,
        templateName: true,
        startedAt: true,
        sentCount: true,
        failedCount: true,
        deliveredCount: true,
        readCount: true,
        _count: {
          select: {
            recipients: true
          }
        }
      }
    });

    if (campaigns.length === 0) {
      console.log('❌ No campaigns currently in "sending" status');
      console.log('\n📋 Checking recent campaigns...\n');
      
      const recentCampaigns = await prisma.whatsAppCampaign.findMany({
        orderBy: { startedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          status: true,
          startedAt: true,
          completedAt: true,
          sentCount: true,
          failedCount: true,
          _count: {
            select: { recipients: true }
          }
        }
      });

      recentCampaigns.forEach(campaign => {
        console.log(`📊 Campaign: ${campaign.name}`);
        console.log(`   Status: ${campaign.status}`);
        console.log(`   Started: ${campaign.startedAt}`);
        console.log(`   Completed: ${campaign.completedAt || 'N/A'}`);
        console.log(`   Sent: ${campaign.sentCount} / ${campaign._count.recipients}`);
        console.log(`   Failed: ${campaign.failedCount}`);
        console.log('');
      });
      
      return;
    }

    console.log(`🔍 Found ${campaigns.length} campaign(s) in "sending" status:\n`);

    for (const campaign of campaigns) {
      console.log(`\n📊 Campaign: ${campaign.name} (ID: ${campaign.id})`);
      console.log(`   Template: ${campaign.templateName}`);
      console.log(`   Status: ${campaign.status}`);
      console.log(`   Started: ${campaign.startedAt}`);
      console.log(`   Progress: ${campaign.sentCount} / ${campaign._count.recipients} messages`);
      console.log(`   Failed: ${campaign.failedCount}`);
      console.log(`   Delivered: ${campaign.deliveredCount}`);
      console.log(`   Read: ${campaign.readCount}`);

      // Get recipient status breakdown
      const recipients = await prisma.whatsAppCampaignRecipient.groupBy({
        by: ['status'],
        where: {
          campaignId: campaign.id
        },
        _count: true
      });

      console.log(`\n   📋 Recipient Status Breakdown:`);
      recipients.forEach(group => {
        console.log(`      ${group.status}: ${group._count} recipients`);
      });

      // Get recent errors
      const failedRecipients = await prisma.whatsAppCampaignRecipient.findMany({
        where: {
          campaignId: campaign.id,
          status: { in: ['failed', 'retry'] }
        },
        select: {
          phoneNumber: true,
          status: true,
          errorCode: true,
          errorMessage: true,
          retryCount: true,
          lastRetryAt: true
        },
        take: 10
      });

      if (failedRecipients.length > 0) {
        console.log(`\n   ❌ Recent Errors (showing up to 10):`);
        failedRecipients.forEach(recipient => {
          console.log(`      ${recipient.phoneNumber}:`);
          console.log(`         Status: ${recipient.status}`);
          console.log(`         Error Code: ${recipient.errorCode || 'N/A'}`);
          console.log(`         Error: ${recipient.errorMessage || 'N/A'}`);
          console.log(`         Retry Count: ${recipient.retryCount}`);
          console.log(`         Last Retry: ${recipient.lastRetryAt || 'N/A'}`);
          console.log('');
        });
      }

      // Check if there are any pending recipients
      const pendingCount = await prisma.whatsAppCampaignRecipient.count({
        where: {
          campaignId: campaign.id,
          status: { in: ['pending', 'sending'] }
        }
      });

      console.log(`\n   ⏳ Pending/Sending: ${pendingCount} recipients`);

      // Check if process might be stuck
      const lastActivity = await prisma.whatsAppCampaignRecipient.findFirst({
        where: {
          campaignId: campaign.id,
          sentAt: { not: null }
        },
        orderBy: {
          sentAt: 'desc'
        },
        select: {
          sentAt: true,
          phoneNumber: true
        }
      });

      if (lastActivity) {
        const minutesSinceLastSend = Math.floor((Date.now() - lastActivity.sentAt.getTime()) / 1000 / 60);
        console.log(`\n   ⏰ Last message sent ${minutesSinceLastSend} minutes ago`);
        console.log(`      To: ${lastActivity.phoneNumber}`);
        
        if (pendingCount > 0 && minutesSinceLastSend > 5) {
          console.log(`\n   ⚠️  WARNING: Campaign may be stuck!`);
          console.log(`      ${pendingCount} messages pending but no activity for ${minutesSinceLastSend} minutes`);
          console.log(`\n   💡 Possible reasons:`);
          console.log(`      - Background process crashed`);
          console.log(`      - Server was restarted`);
          console.log(`      - Database connection lost`);
          console.log(`      - Rate limiting or API errors`);
          console.log(`\n   🔧 Suggested actions:`);
          console.log(`      1. Check server logs for errors`);
          console.log(`      2. Restart the campaign by calling POST /api/whatsapp/campaigns/${campaign.id}/send`);
          console.log(`      3. Or pause and resume from the UI`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error checking campaign status:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
checkCampaignStatus()
  .then(() => {
    console.log('\n✅ Status check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Status check failed:', error);
    process.exit(1);
  });
