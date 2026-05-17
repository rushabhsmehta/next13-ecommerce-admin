import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  requireAuditRead,
  requireSettingsRead,
} from "@/app/api/mobile/lib/assert-settings-access";

export const dynamic = "force-dynamic";

function iso(value: any) {
  return value?.toISOString?.() ?? value ?? null;
}

function auditFormat(row: any) {
  return {
    id: row.id,
    entityId: row.entityId,
    entityType: row.entityType,
    action: row.action,
    userEmail: row.userEmail,
    userName: row.userName,
    userRole: row.userRole,
    metadata: row.metadata,
    createdAt: iso(row.createdAt),
  };
}

export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized", code: "AUTH" }, { status: 401 });
    const settingsGuard = await requireSettingsRead(userId);
    if (!settingsGuard.ok) return settingsGuard.response;
    const auditGuard = await requireAuditRead(userId);
    if (!auditGuard.ok) return auditGuard.response;

    const { searchParams } = new URL(req.url);
    const auditSearch = searchParams.get("auditSearch")?.trim() ?? "";

    const auditWhere = auditSearch
      ? {
          OR: [
            { entityType: { contains: auditSearch } },
            { action: { contains: auditSearch } },
            { userEmail: { contains: auditSearch } },
            { userName: { contains: auditSearch } },
          ],
        }
      : {};

    const [
      organization,
      units,
      taxSlabs,
      mealPlans,
      roomTypes,
      occupancyTypes,
      vehicleTypes,
      pricingAttributes,
      pricingComponents,
      tdsSections,
      auditLogs,
    ] = await Promise.all([
      prismadb.organization.findFirst({ orderBy: { createdAt: "asc" } }),
      prismadb.unitOfMeasure.findMany({ orderBy: { name: "asc" } }),
      prismadb.taxSlab.findMany({ orderBy: { name: "asc" } }),
      prismadb.mealPlan.findMany({ orderBy: { name: "asc" } }),
      prismadb.roomType.findMany({ orderBy: { name: "asc" } }),
      prismadb.occupancyType.findMany({ orderBy: [{ rank: "asc" }, { name: "asc" }] }),
      prismadb.vehicleType.findMany({ orderBy: { name: "asc" } }),
      prismadb.pricingAttribute.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
      prismadb.pricingComponent.findMany({
        include: { pricingAttribute: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prismadb.tDSMaster.findMany({ orderBy: [{ sectionCode: "asc" }, { effectiveFrom: "desc" }] }),
      prismadb.auditLog.findMany({ where: auditWhere, orderBy: { createdAt: "desc" }, take: 50 }),
    ]);

    return NextResponse.json({
      organization,
      masters: {
        units,
        taxSlabs,
        mealPlans,
        roomTypes,
        occupancyTypes,
        vehicleTypes,
        pricingAttributes,
        pricingComponents: pricingComponents.map((row) => ({
          id: row.id,
          price: Number(row.price),
          purchasePrice: row.purchasePrice == null ? null : Number(row.purchasePrice),
          description: row.description,
          pricingAttributeId: row.pricingAttributeId,
          pricingAttributeName: row.pricingAttribute.name,
          createdAt: iso(row.createdAt),
        })),
        tdsSections,
      },
      auditLogs: auditLogs.map(auditFormat),
    });
  } catch (error) {
    console.log("[MOBILE_SETTINGS_SUMMARY_GET]", error);
    return NextResponse.json({ error: "Internal error", code: "SERVER" }, { status: 500 });
  }
}

