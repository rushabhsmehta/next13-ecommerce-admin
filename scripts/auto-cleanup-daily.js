/**
 * 🧹 AUTOMATED DAILY CLEANUP - Prevents Database From Filling Up
 * 
 * This script runs automatically to keep database size under control.
 * Deletes old data before disk fills up on Railway free tier.
 * 
 * Run via cron or Railway scheduled task:
 * Schedule: Every day at 2:00 AM UTC
 * Command: node scripts/auto-cleanup-daily.js
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function cleanupDatabase() {
  console.log("🧹 Starting automated daily cleanup...");
  console.log(`⏰ Running at: ${new Date().toISOString()}\n`);

  try {
    // Calculate retention cutoff dates
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    console.log("📅 Retention policies:");
    console.log(`   Analytics events: ${threeDaysAgo.toISOString()} (3 days)`);
    console.log(`   WhatsApp messages: ${sevenDaysAgo.toISOString()} (7 days)`);
    console.log(`   Inactive sessions: ${twoHoursAgo.toISOString()} (2 hours)`);
    console.log(`   Old campaign recipients: ${thirtyDaysAgo.toISOString()} (30 days)\n`);

    let totalDeleted = 0;

    // 1. Delete old analytics events (keep last 3 days only)
    console.log("🗑️  Deleting analytics events older than 3 days...");
    const deletedAnalytics = await prisma.whatsAppAnalyticsEvent.deleteMany({
      where: {
        createdAt: {
          lt: threeDaysAgo,
        },
      },
    });
    console.log(`   ✅ Deleted ${deletedAnalytics.count} analytics events\n`);
    totalDeleted += deletedAnalytics.count;

    // 2. Delete old WhatsApp messages (keep last 7 days)
    console.log("🗑️  Deleting WhatsApp messages older than 7 days...");
    const deletedMessages = await prisma.whatsAppMessage.deleteMany({
      where: {
        createdAt: {
          lt: sevenDaysAgo,
        },
      },
    });
    console.log(`   ✅ Deleted ${deletedMessages.count} messages\n`);
    totalDeleted += deletedMessages.count;

    // 3. Delete inactive sessions (older than 2 hours)
    console.log("🗑️  Deleting inactive WhatsApp sessions...");
    const deletedSessions = await prisma.whatsAppSession.deleteMany({
      where: {
        updatedAt: {
          lt: twoHoursAgo,
        },
      },
    });
    console.log(`   ✅ Deleted ${deletedSessions.count} inactive sessions\n`);
    totalDeleted += deletedSessions.count;

    // 4. Delete old campaign recipients from completed/failed/cancelled campaigns
    console.log("🗑️  Deleting old recipients from finished campaigns...");
    
    // First, find old completed/failed/cancelled campaigns
    const oldCampaigns = await prisma.whatsAppCampaign.findMany({
      where: {
        status: {
          in: ["completed", "failed", "cancelled"],
        },
        updatedAt: {
          lt: thirtyDaysAgo,
        },
      },
      select: {
        id: true,
      },
    });

    const oldCampaignIds = oldCampaigns.map((c) => c.id);
    console.log(`   Found ${oldCampaignIds.length} old finished campaigns`);

    let deletedRecipients = 0;
    if (oldCampaignIds.length > 0) {
      const recipientsResult = await prisma.whatsAppCampaignRecipient.deleteMany({
        where: {
          campaignId: {
            in: oldCampaignIds,
          },
        },
      });
      deletedRecipients = recipientsResult.count;
    }
    console.log(`   ✅ Deleted ${deletedRecipients} old campaign recipients\n`);
    totalDeleted += deletedRecipients;

    // 5. Get current database stats
    console.log("📊 Current database size after cleanup:");
    const [
      analyticsCount,
      messagesCount,
      sessionsCount,
      recipientsCount,
      customersCount,
      campaignsCount,
    ] = await Promise.all([
      prisma.whatsAppAnalyticsEvent.count(),
      prisma.whatsAppMessage.count(),
      prisma.whatsAppSession.count(),
      prisma.whatsAppCampaignRecipient.count(),
      prisma.whatsAppCustomer.count(),
      prisma.whatsAppCampaign.count(),
    ]);

    console.log(`   Analytics events: ${analyticsCount}`);
    console.log(`   Messages: ${messagesCount}`);
    console.log(`   Sessions: ${sessionsCount}`);
    console.log(`   Campaign recipients: ${recipientsCount}`);
    console.log(`   Customers: ${customersCount}`);
    console.log(`   Campaigns: ${campaignsCount}\n`);

    console.log(`✅ Cleanup complete! Total records deleted: ${totalDeleted}`);
    console.log(`⏰ Finished at: ${new Date().toISOString()}\n`);

    // Warning if database is still large
    const totalRecords = analyticsCount + messagesCount + sessionsCount + recipientsCount;
    if (totalRecords > 5000) {
      console.log("⚠️  WARNING: Database still has >5000 records.");
      console.log("   Consider upgrading Railway or adjusting retention policies.");
    }

  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run cleanup
cleanupDatabase()
  .then(() => {
    console.log("🎉 Daily cleanup job completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Daily cleanup job failed:", error);
    process.exit(1);
  });
