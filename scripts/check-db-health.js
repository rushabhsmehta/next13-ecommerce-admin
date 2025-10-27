/**
 * 📊 Quick Database Health Check
 * 
 * Run: npm run check-db-health
 * 
 * Shows current database size and warns if approaching limits.
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkHealth() {
  console.log("📊 Checking database health...\n");

  try {
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

    const totalRecords = 
      analyticsCount + 
      messagesCount + 
      sessionsCount + 
      recipientsCount + 
      customersCount + 
      campaignsCount;

    console.log("Database Tables:");
    console.log(`  Analytics events:     ${analyticsCount.toString().padStart(6)}`);
    console.log(`  Messages:             ${messagesCount.toString().padStart(6)}`);
    console.log(`  Sessions:             ${sessionsCount.toString().padStart(6)}`);
    console.log(`  Campaign recipients:  ${recipientsCount.toString().padStart(6)}`);
    console.log(`  Customers:            ${customersCount.toString().padStart(6)}`);
    console.log(`  Campaigns:            ${campaignsCount.toString().padStart(6)}`);
    console.log(`  ${"─".repeat(30)}`);
    console.log(`  Total records:        ${totalRecords.toString().padStart(6)}\n`);

    // Estimate disk usage (rough)
    const estimatedMB = Math.round((totalRecords * 1) / 1024);
    console.log(`Estimated size: ~${estimatedMB} MB\n`);

    // Health warnings
    if (totalRecords > 10000) {
      console.log("🔴 CRITICAL: Database exceeds 10,000 records!");
      console.log("   Action: Run cleanup immediately: npm run cleanup-database\n");
    } else if (totalRecords > 5000) {
      console.log("🟡 WARNING: Database exceeds 5,000 records");
      console.log("   Action: Schedule cleanup soon: npm run cleanup-database\n");
    } else {
      console.log("✅ Healthy: Database size is good\n");
    }

    // Specific warnings
    if (analyticsCount > 1000) {
      console.log(`⚠️  ${analyticsCount} analytics events (retention: 3 days)`);
    }
    if (recipientsCount > 2000) {
      console.log(`⚠️  ${recipientsCount} campaign recipients (cleanup old campaigns)`);
    }
    if (sessionsCount > 100) {
      console.log(`⚠️  ${sessionsCount} sessions (cleanup inactive sessions)`);
    }

  } catch (error) {
    console.error("❌ Health check failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkHealth()
  .then(() => {
    console.log("\n✅ Health check complete");
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });
