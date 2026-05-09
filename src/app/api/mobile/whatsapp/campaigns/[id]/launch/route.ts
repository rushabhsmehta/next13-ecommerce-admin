import { NextResponse } from "next/server";
import { prepareCampaignForDispatch } from "@/lib/whatsapp-campaign-worker";
import { validateClerkAdmin } from "@/app/api/mobile/lib/auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const prepared = await prepareCampaignForDispatch(id);

    return NextResponse.json({
      success: true,
      campaignId: prepared.campaignId,
      recipientsCount: prepared.recipientsCount,
      mode: prepared.mode,
      queued: true,
      launchedBy: admin.userId,
    });
  } catch (error: any) {
    const message = error?.message ?? "Failed to queue campaign";
    const status =
      message === "Campaign not found"
        ? 404
        : message === "Campaign cannot be sent in current status" ||
            message === "Campaign has no recipients to send"
          ? 400
          : 500;
    console.log("[MOBILE_WA_CAMPAIGN_LAUNCH]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
