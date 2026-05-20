import { NextResponse } from "next/server";
import whatsappPrisma from "@/lib/whatsapp-prismadb";
import { validateClerkAdmin } from "@/app/api/mobile/lib/auth";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const EDITABLE_CAMPAIGN_STATUSES = new Set(["draft", "scheduled"]);

function normalizePhone(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Keep digits and a leading +; collapse the rest.
  const cleaned = trimmed.replace(/[^\d+]/g, "");
  return cleaned.length >= 6 ? cleaned : null;
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

interface RecipientInput {
  phoneNumber: string;
  name?: string | null;
  customerId?: string | null;
  variables?: Record<string, unknown>;
}

async function refreshCampaignRecipientCount(campaignId: string) {
  const totalRecipients = await whatsappPrisma.whatsAppCampaignRecipient.count({
    where: { campaignId },
  });
  await whatsappPrisma.whatsAppCampaign.update({
    where: { id: campaignId },
    data: { totalRecipients },
  });
  return totalRecipients;
}

async function assertCampaignEditable(campaignId: string) {
  const campaign = await whatsappPrisma.whatsAppCampaign.findUnique({
    where: { id: campaignId },
    select: { id: true, status: true },
  });
  if (!campaign) return { ok: false as const, status: 404, error: "Campaign not found" };
  if (!EDITABLE_CAMPAIGN_STATUSES.has(campaign.status)) {
    return {
      ok: false as const,
      status: 400,
      error: "Campaign is locked — only draft or scheduled campaigns can be edited",
    };
  }
  return { ok: true as const };
}

export async function POST(req: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const editable = await assertCampaignEditable(id);
    if (!editable.ok) {
      return NextResponse.json({ error: editable.error }, { status: editable.status });
    }

    const body = await req.json();
    const recipientsInput = Array.isArray(body?.recipients)
      ? (body.recipients as RecipientInput[])
      : [];
    const importFromCustomers = body?.importFromCustomers === true;
    const customerFilter: { hasOptedIn?: boolean; tags?: string[] } = {};
    if (body?.customerFilter && typeof body.customerFilter === "object") {
      if (typeof body.customerFilter.hasOptedIn === "boolean") {
        customerFilter.hasOptedIn = body.customerFilter.hasOptedIn;
      }
      if (Array.isArray(body.customerFilter.tags)) {
        customerFilter.tags = body.customerFilter.tags.filter(
          (t: unknown): t is string => typeof t === "string"
        );
      }
    }

    const normalizedRecipients: RecipientInput[] = [];

    for (const r of recipientsInput) {
      const phone = normalizePhone(r?.phoneNumber);
      if (!phone) continue;
      normalizedRecipients.push({
        phoneNumber: phone,
        name: r?.name ?? null,
        customerId: r?.customerId ?? null,
        variables:
          r?.variables && typeof r.variables === "object" ? r.variables : {},
      });
    }

    if (importFromCustomers) {
      const where: any = {};
      if (customerFilter.hasOptedIn !== undefined) {
        where.hasOptedIn = customerFilter.hasOptedIn;
      }
      if (customerFilter.tags && customerFilter.tags.length > 0) {
        where.tags = { hasSome: customerFilter.tags };
      }
      const customers = await whatsappPrisma.whatsAppCustomer.findMany({
        where,
        select: { id: true, phoneNumber: true, firstName: true, lastName: true },
        take: 5000,
      });
      for (const c of customers) {
        const phone = normalizePhone(c.phoneNumber);
        if (!phone) continue;
        const fullName = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
        normalizedRecipients.push({
          phoneNumber: phone,
          name: fullName || null,
          customerId: c.id,
          variables: {},
        });
      }
    }

    if (normalizedRecipients.length === 0) {
      return NextResponse.json(
        { error: "No valid recipients provided" },
        { status: 400 }
      );
    }

    // Dedupe by phone within the request — DB unique constraint handles
    // cross-request duplicates via skipDuplicates.
    const seen = new Set<string>();
    const deduped = normalizedRecipients.filter((r) => {
      if (seen.has(r.phoneNumber)) return false;
      seen.add(r.phoneNumber);
      return true;
    });

    const result = await whatsappPrisma.whatsAppCampaignRecipient.createMany({
      data: deduped.map((r) => ({
        campaignId: id,
        phoneNumber: r.phoneNumber,
        customerId: r.customerId ?? null,
        name: r.name ?? null,
        variables: (r.variables ?? {}) as any,
      })),
      skipDuplicates: true,
    });

    const totalRecipients = await refreshCampaignRecipientCount(id);

    await recordMobileAudit({
      userId: admin.userId,
      entityType: "WhatsAppCampaignRecipient",
      entityId: id,
      action: "CREATE",
      metadata: {
        added: result.count,
        attempted: deduped.length,
        importFromCustomers,
      },
    });

    return NextResponse.json({
      added: result.count,
      attempted: deduped.length,
      totalRecipients,
    });
  } catch (error: any) {
    console.log("[MOBILE_WA_CAMPAIGN_RECIPIENTS_POST]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to add recipients" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const editable = await assertCampaignEditable(id);
    if (!editable.ok) {
      return NextResponse.json({ error: editable.error }, { status: editable.status });
    }

    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get("ids");
    const recipientIds = idsParam
      ? idsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    if (recipientIds.length === 0) {
      return NextResponse.json(
        { error: "ids query parameter is required (comma-separated recipient ids)" },
        { status: 400 }
      );
    }

    const result = await whatsappPrisma.whatsAppCampaignRecipient.deleteMany({
      where: { id: { in: recipientIds }, campaignId: id },
    });

    const totalRecipients = await refreshCampaignRecipientCount(id);

    await recordMobileAudit({
      userId: admin.userId,
      entityType: "WhatsAppCampaignRecipient",
      entityId: id,
      action: "DELETE",
      metadata: { removed: result.count, requested: recipientIds.length },
    });

    return NextResponse.json({
      removed: result.count,
      totalRecipients,
    });
  } catch (error: any) {
    console.log("[MOBILE_WA_CAMPAIGN_RECIPIENTS_DELETE]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to remove recipients" },
      { status: 500 }
    );
  }
}

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
