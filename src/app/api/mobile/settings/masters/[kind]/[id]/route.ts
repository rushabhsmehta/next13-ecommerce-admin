import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireSettingsWrite } from "@/app/api/mobile/lib/assert-settings-access";
import { findPriorIdempotentEntityId, readIdempotencyKey } from "@/app/api/mobile/lib/finance-guard";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().optional(),
  code: z.string().optional(),
  abbreviation: z.string().optional(),
  description: z.string().optional().nullable(),
  percentage: z.coerce.number().optional(),
  maxPersons: z.coerce.number().int().optional(),
  rank: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
  price: z.coerce.number().optional(),
  purchasePrice: z.coerce.number().optional().nullable(),
  rateWithPan: z.coerce.number().optional().nullable(),
  rateWithoutPan: z.coerce.number().optional().nullable(),
  thresholdAmount: z.coerce.number().optional().nullable(),
});

function clean(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

const DELETABLE_KINDS = new Set(["pricing-components", "tds-sections"]);

async function deleteMaster(kind: string, id: string) {
  switch (kind) {
    case "pricing-components":
      return prismadb.pricingComponent.delete({ where: { id } });
    case "tds-sections":
      return prismadb.tDSMaster.delete({ where: { id } });
    default:
      throw new Error("Delete not supported for this settings kind");
  }
}

async function updateMaster(kind: string, id: string, data: Record<string, unknown>) {
  switch (kind) {
    case "units":
      return prismadb.unitOfMeasure.update({ where: { id }, data });
    case "tax-slabs":
      return prismadb.taxSlab.update({ where: { id }, data });
    case "meal-plans":
      return prismadb.mealPlan.update({ where: { id }, data });
    case "room-types":
      return prismadb.roomType.update({ where: { id }, data });
    case "occupancy-types":
      return prismadb.occupancyType.update({ where: { id }, data });
    case "vehicle-types":
      return prismadb.vehicleType.update({ where: { id }, data });
    case "pricing-attributes":
      return prismadb.pricingAttribute.update({ where: { id }, data });
    case "pricing-components":
      return prismadb.pricingComponent.update({ where: { id }, data });
    case "tds-sections":
      return prismadb.tDSMaster.update({ where: { id }, data });
    default:
      throw new Error("Unknown settings kind");
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ kind: string; id: string }> }) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized", code: "AUTH" }, { status: 401 });
    const guard = await requireSettingsWrite(userId);
    if (!guard.ok) return guard.response;
    const key = readIdempotencyKey(req);
    if (!key) return NextResponse.json({ error: "Idempotency-Key header is required" }, { status: 400 });
    const prior = await findPriorIdempotentEntityId(`Settings:${params.kind}`, key);
    if (prior) return NextResponse.json({ id: prior, idempotentReplay: true });

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid settings payload", details: parsed.error.flatten() }, { status: 422 });
    }
    const data = clean(parsed.data);
    if (!Object.keys(data).length) return NextResponse.json({ error: "No fields provided" }, { status: 400 });

    const row = await updateMaster(params.kind, params.id, data);
    await recordMobileAudit({
      userId,
      entityType: `Settings:${params.kind}`,
      entityId: params.id,
      action: "UPDATE",
      metadata: { idempotencyKey: key, kind: params.kind, fields: Object.keys(data) },
    });
    return NextResponse.json(row);
  } catch (error: any) {
    console.log("[MOBILE_SETTINGS_MASTER_PATCH]", error);
    return NextResponse.json({ error: error?.message ?? "Internal error", code: "SERVER" }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ kind: string; id: string }> }) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized", code: "AUTH" }, { status: 401 });
    const guard = await requireSettingsWrite(userId);
    if (!guard.ok) return guard.response;
    if (!DELETABLE_KINDS.has(params.kind)) {
      return NextResponse.json({ error: "Delete not supported for this settings kind" }, { status: 400 });
    }
    const key = readIdempotencyKey(req);
    if (!key) return NextResponse.json({ error: "Idempotency-Key header is required" }, { status: 400 });
    const prior = await findPriorIdempotentEntityId(`Settings:${params.kind}`, key);
    if (prior) return NextResponse.json({ id: prior, idempotentReplay: true });

    await deleteMaster(params.kind, params.id);
    await recordMobileAudit({
      userId,
      entityType: `Settings:${params.kind}`,
      entityId: params.id,
      action: "DELETE",
      metadata: { idempotencyKey: key, kind: params.kind },
    });
    return NextResponse.json({ success: true, id: params.id });
  } catch (error: any) {
    console.log("[MOBILE_SETTINGS_MASTER_DELETE]", error);
    return NextResponse.json({ error: error?.message ?? "Internal error", code: "SERVER" }, { status: 500 });
  }
}

