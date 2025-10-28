import { NextResponse } from "next/server";
import whatsappPrisma from "@/lib/whatsapp-prismadb";
import { auth } from "@clerk/nextjs";

/**
 * 📊 Database Health Check API
 * 
 * GET /api/whatsapp/database-health
 * 
 * Returns current database size and warns if approaching limits.
 * Use this to monitor database growth and prevent crashes.
 */

export async function GET() {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Count all major tables
    const [
      analyticsCount,
      messagesCount,
      sessionsCount,
      recipientsCount,
      customersCount,
      campaignsCount,
      templatesCount,
    ] = await Promise.all([
      whatsappPrisma.whatsAppAnalyticsEvent.count(),
      whatsappPrisma.whatsAppMessage.count(),
      whatsappPrisma.whatsAppSession.count(),
      whatsappPrisma.whatsAppCampaignRecipient.count(),
      whatsappPrisma.whatsAppCustomer.count(),
      whatsappPrisma.whatsAppCampaign.count(),
      whatsappPrisma.whatsAppTemplate.count(),
    ]);

    const totalRecords = 
      analyticsCount + 
      messagesCount + 
      sessionsCount + 
      recipientsCount + 
      customersCount + 
      campaignsCount + 
      templatesCount;

    // Calculate approximate disk usage (rough estimate)
    // Assume ~1KB per record on average
    const estimatedSizeMB = (totalRecords * 1) / 1024;

    // Determine health status
    let status = "healthy";
    let warnings = [];

    if (totalRecords > 10000) {
      status = "critical";
      warnings.push("Total records exceeds 10,000 - immediate cleanup needed");
    } else if (totalRecords > 5000) {
      status = "warning";
      warnings.push("Total records exceeds 5,000 - cleanup recommended soon");
    }

    if (analyticsCount > 1000) {
      warnings.push(`${analyticsCount} analytics events - consider reducing retention`);
    }

    if (recipientsCount > 2000) {
      warnings.push(`${recipientsCount} campaign recipients - delete old campaigns`);
    }

    if (sessionsCount > 100) {
      warnings.push(`${sessionsCount} sessions - cleanup inactive sessions`);
    }

    return NextResponse.json({
      status,
      totalRecords,
      estimatedSizeMB: Math.round(estimatedSizeMB),
      tables: {
        analytics: analyticsCount,
        messages: messagesCount,
        sessions: sessionsCount,
        recipients: recipientsCount,
        customers: customersCount,
        campaigns: campaignsCount,
        templates: templatesCount,
      },
      warnings,
      recommendations: status === "healthy" 
        ? ["Database is healthy. Regular cleanup is working well."]
        : [
            "Run: node scripts/auto-cleanup-daily.js",
            "Consider upgrading Railway to Hobby plan ($5/month)",
            "Review analytics retention policy (currently 3 days)",
          ],
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("❌ Database health check failed:", error);
    return NextResponse.json(
      { error: "Failed to check database health" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
