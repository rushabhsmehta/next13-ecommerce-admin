import { NextResponse } from "next/server";
import whatsappPrisma from "@/lib/whatsapp-prismadb";
import { createTourPackage } from "@/lib/whatsapp-catalog";
import { validateClerkAdmin } from "@/app/api/mobile/lib/auth";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const VALID_STATUSES = new Set(["draft", "active", "archived"]);
const VALID_SYNC = new Set(["pending", "syncing", "synced", "failed"]);

export async function POST(req: Request) {
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    if (!body?.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const tourPackage = await createTourPackage(body);

    await recordMobileAudit({
      userId: admin.userId,
      entityType: "WhatsAppTourPackage",
      entityId: tourPackage.id,
      action: "CREATE",
      metadata: { title: tourPackage.title },
    });

    return NextResponse.json({ tourPackage }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A catalog entry for this product already exists" },
        { status: 409 }
      );
    }
    console.log("[MOBILE_WA_CATALOG_PRODUCT_CREATE]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create catalog entry" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const syncStatus = searchParams.get("syncStatus");
    const search = (searchParams.get("search") ?? "").trim();
    const sendableOnly = searchParams.get("sendable") === "true";
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
    if (status && VALID_STATUSES.has(status)) where.status = status;
    if (syncStatus && VALID_SYNC.has(syncStatus)) where.syncStatus = syncStatus;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { subtitle: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
        { retailerId: { contains: search, mode: "insensitive" } },
      ];
    }
    if (sendableOnly) {
      // To send via interactive 'product' you need a synced retailer id.
      where.retailerId = { not: null };
    }

    const [total, packages] = await Promise.all([
      whatsappPrisma.whatsAppTourPackage.count({ where }),
      whatsappPrisma.whatsAppTourPackage.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { product: true },
      }),
    ]);

    return NextResponse.json({
      items: packages.map((p) => ({
        id: p.id,
        title: p.title,
        subtitle: p.subtitle,
        location: p.location,
        heroImageUrl: p.heroImageUrl,
        durationDays: p.durationDays,
        durationNights: p.durationNights,
        basePrice: p.basePrice ? p.basePrice.toString() : null,
        currency: p.currency,
        status: p.status,
        syncStatus: p.syncStatus,
        retailerId: p.retailerId,
        catalogProductId: p.catalogProductId,
        productSku: p.product?.sku ?? null,
        productName: p.product?.name ?? null,
        updatedAt: p.updatedAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.log("[MOBILE_WA_CATALOG_PRODUCTS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
