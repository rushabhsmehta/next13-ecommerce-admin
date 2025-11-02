/**
 * Script to resume stuck campaigns
 * This will restart the background processing for campaigns in "sending" status
 */

const { PrismaClient } = require('@prisma/whatsapp-client');

const prisma = new PrismaClient();

async function resumeStuckCampaigns() {
  console.log('🔍 Looking for stuck campaigns...\n');

  try {
    // Find campaigns in "sending" status
    const stuckCampaigns = await prisma.whatsAppCampaign.findMany({
      where: {
        status: 'sending'
      },
      select: {
        id: true,
        name: true,
        sentCount: true,
        _count: {
          select: { recipients: true }
        }
      }
    });

    if (stuckCampaigns.length === 0) {
      console.log('✅ No stuck campaigns found');
      return;
    }

    console.log(`📋 Found ${stuckCampaigns.length} campaign(s) in "sending" status:\n`);

    for (const campaign of stuckCampaigns) {
      console.log(`   - ${campaign.name}: ${campaign.sentCount}/${campaign._count.recipients} sent`);
    }

    console.log('\n💡 To resume a campaign, you have two options:\n');
    console.log('Option 1: Use the UI');
    console.log('   - Go to the campaign page');
    console.log('   - Click "Pause" then "Resume"');
    console.log('');
    console.log('Option 2: Make an API call');
    console.log('   For each campaign, call:');
    console.log('');

    for (const campaign of stuckCampaigns) {
      console.log(`   POST https://admin.aagamholidays.com/api/whatsapp/campaigns/${campaign.id}/send`);
    }

    console.log('');
    console.log('⚠️  Note: The current implementation does not persist background');
    console.log('   processes across server restarts. Consider implementing:');
    console.log('   - Bull queue with Redis');
    console.log('   - Or a separate worker process');
    console.log('   - Or a cron job to check and resume stuck campaigns');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
resumeStuckCampaigns()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
