import { NextResponse } from "next/server";
import whatsappPrisma from "@/lib/whatsapp-prismadb";
import { validateClerkAdmin } from "@/app/api/mobile/lib/auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const VALID_STATUSES = new Set([
  "pending",
  "sending",
  "sent",
  "delivered",
  "read",
  "failed",
  "retry",
  "responded",
]);

export async function GET(req: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = Math.min(
      Math.max(
        parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) ||
          DEFAULT_LIMIT,
        1,
      ),
      MAX_LIMIT,
    );
    const cursor = searchParams.get("cursor"); // recipient id

    const where: any = { campaignId: id };
    if (status && VALID_STATUSES.has(status)) where.status = status;

    const items = await whatsappPrisma.whatsAppCampaignRecipient.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: "asc" },
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    const hasMore = items.length > limit;
    const sliced = hasMore ? items.slice(0, limit) : items;
    const nextCursor =
      hasMore && sliced.length > 0 ? sliced[sliced.length - 1].id : null;

    return NextResponse.json({
      items: sliced.map((r) => ({
        id: r.id,
        phoneNumber: r.phoneNumber,
        name: r.name,
        status: r.status,
        sentAt: r.sentAt ? r.sentAt.toISOString() : null,
        deliveredAt: r.deliveredAt ? r.deliveredAt.toISOString() : null,
        readAt: r.readAt ? r.readAt.toISOString() : null,
        failedAt: r.failedAt ? r.failedAt.toISOString() : null,
        errorCode: r.errorCode,
        errorMessage: r.errorMessage,
        retryCount: r.retryCount,
        respondedAt: r.respondedAt ? r.respondedAt.toISOString() : null,
      })),
      nextCursor,
    });
  } catch (error) {
    console.log("[MOBILE_WA_CAMPAIGN_RECIPIENTS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
