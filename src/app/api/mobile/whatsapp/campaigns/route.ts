import { NextResponse } from "next/server";
import whatsappPrisma from "@/lib/whatsapp-prismadb";
import { validateClerkAdmin } from "@/app/api/mobile/lib/auth";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const VALID_STATUSES = new Set([
  "draft",
  "scheduled",
  "sending",
  "paused",
  "completed",
  "failed",
]);

function serialize(c: any) {
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? null,
    templateName: c.templateName,
    templateLanguage: c.templateLanguage,
    status: c.status,
    scheduledFor: c.scheduledFor ? c.scheduledFor.toISOString() : null,
    startedAt: c.startedAt ? c.startedAt.toISOString() : null,
    completedAt: c.completedAt ? c.completedAt.toISOString() : null,
    rateLimit: c.rateLimit,
    counters: {
      total: c.totalRecipients,
      sent: c.sentCount,
      delivered: c.deliveredCount,
      read: c.readCount,
      failed: c.failedCount,
      responded: c.respondedCount,
    },
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export async function GET(req: Request) {
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = (searchParams.get("search") ?? "").trim();
    const limit = Math.min(
      Math.max(
        parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) ||
          DEFAULT_LIMIT,
        1,
      ),
      MAX_LIMIT,
    );
    const page = Math.max(
      parseInt(searchParams.get("page") ?? "1", 10) || 1,
      1,
    );

    const where: any = {};
    if (status && VALID_STATUSES.has(status)) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { templateName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [campaigns, total] = await Promise.all([
      whatsappPrisma.whatsAppCampaign.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      whatsappPrisma.whatsAppCampaign.count({ where }),
    ]);

    return NextResponse.json({
      items: campaigns.map(serialize),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.log("[MOBILE_WA_CAMPAIGNS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
