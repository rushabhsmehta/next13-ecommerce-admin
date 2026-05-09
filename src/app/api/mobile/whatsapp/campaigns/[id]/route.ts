import { NextResponse } from "next/server";
import whatsappPrisma from "@/lib/whatsapp-prismadb";
import { validateClerkAdmin } from "@/app/api/mobile/lib/auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const campaign = await whatsappPrisma.whatsAppCampaign.findUnique({
      where: { id },
    });
    if (!campaign) {
      return new NextResponse("Campaign not found", { status: 404 });
    }

    // Per-status pending counters help the launch confirm dialog render
    // accurate "X recipients will receive this".
    const [pending, retry] = await Promise.all([
      whatsappPrisma.whatsAppCampaignRecipient.count({
        where: { campaignId: id, status: "pending" },
      }),
      whatsappPrisma.whatsAppCampaignRecipient.count({
        where: { campaignId: id, status: "retry" },
      }),
    ]);

    return NextResponse.json({
      id: campaign.id,
      name: campaign.name,
      description: campaign.description ?? null,
      templateName: campaign.templateName,
      templateLanguage: campaign.templateLanguage,
      status: campaign.status,
      scheduledFor: campaign.scheduledFor
        ? campaign.scheduledFor.toISOString()
        : null,
      startedAt: campaign.startedAt ? campaign.startedAt.toISOString() : null,
      completedAt: campaign.completedAt
        ? campaign.completedAt.toISOString()
        : null,
      rateLimit: campaign.rateLimit,
      retryFailed: campaign.retryFailed,
      maxRetries: campaign.maxRetries,
      counters: {
        total: campaign.totalRecipients,
        sent: campaign.sentCount,
        delivered: campaign.deliveredCount,
        read: campaign.readCount,
        failed: campaign.failedCount,
        responded: campaign.respondedCount,
        pending,
        retry,
      },
      templateVariables: campaign.templateVariables ?? null,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
    });
  } catch (error) {
    console.log("[MOBILE_WA_CAMPAIGN_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
