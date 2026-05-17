import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireSettingsWrite } from "@/app/api/mobile/lib/assert-settings-access";
import { findPriorIdempotentEntityId, readIdempotencyKey } from "@/app/api/mobile/lib/finance-guard";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

const createSchema = z.object({
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
  pricingAttributeId: z.string().optional(),
  sectionCode: z.string().optional(),
  rateWithPan: z.coerce.number().optional().nullable(),
  rateWithoutPan: z.coerce.number().optional().nullable(),
  thresholdAmount: z.coerce.number().optional().nullable(),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().optional().nullable(),
  isGstTds: z.boolean().optional(),
  isIncomeTaxTds: z.boolean().optional(),
});

function dateOrNull(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function entityType(kind: string) {
  return `Settings:${kind}`;
}

async function createMaster(kind: string, v: z.infer<typeof createSchema>) {
  switch (kind) {
    case "units":
      if (!v.name || !v.abbreviation) throw new Error("Name and abbreviation are required");
      return prismadb.unitOfMeasure.create({
        data: { name: v.name, abbreviation: v.abbreviation, description: v.description ?? null, isActive: v.isActive ?? true },
      });
    case "tax-slabs":
      if (!v.name || v.percentage == null) throw new Error("Name and percentage are required");
      return prismadb.taxSlab.create({
        data: { name: v.name, percentage: v.percentage, description: v.description ?? null, isActive: v.isActive ?? true },
      });
    case "meal-plans":
      if (!v.name || !v.code) throw new Error("Name and code are required");
      return prismadb.mealPlan.create({
        data: { name: v.name, code: v.code, description: v.description ?? "", isActive: v.isActive ?? true },
      });
    case "room-types":
      if (!v.name) throw new Error("Name is required");
      return prismadb.roomType.create({
        data: { name: v.name, description: v.description ?? null, isActive: v.isActive ?? true },
      });
    case "occupancy-types":
      if (!v.name || v.maxPersons == null) throw new Error("Name and max persons are required");
      return prismadb.occupancyType.create({
        data: { name: v.name, maxPersons: v.maxPersons, description: v.description ?? null, rank: v.rank ?? 0, isActive: v.isActive ?? true },
      });
    case "vehicle-types":
      if (!v.name) throw new Error("Name is required");
      return prismadb.vehicleType.create({
        data: { name: v.name, description: v.description ?? null, isActive: v.isActive ?? true },
      });
    case "pricing-attributes":
      if (!v.name) throw new Error("Name is required");
      return prismadb.pricingAttribute.create({
        data: { name: v.name, description: v.description ?? null, sortOrder: v.sortOrder ?? 0, isDefault: v.isDefault ?? false, isActive: v.isActive ?? true },
      });
    case "pricing-components":
      if (!v.pricingAttributeId || v.price == null) throw new Error("Pricing attribute and price are required");
      return prismadb.pricingComponent.create({
        data: {
          pricingAttributeId: v.pricingAttributeId,
          price: v.price,
          purchasePrice: v.purchasePrice ?? null,
          description: v.description ?? null,
        },
      });
    case "tds-sections":
      if (!v.sectionCode) throw new Error("Section code is required");
      return prismadb.tDSMaster.create({
        data: {
          sectionCode: v.sectionCode,
          description: v.description ?? null,
          thresholdAmount: v.thresholdAmount ?? null,
          rateWithPan: v.rateWithPan ?? null,
          rateWithoutPan: v.rateWithoutPan ?? null,
          effectiveFrom: dateOrNull(v.effectiveFrom) ?? new Date(),
          effectiveTo: dateOrNull(v.effectiveTo),
          isGstTds: v.isGstTds ?? false,
          isIncomeTaxTds: v.isIncomeTaxTds ?? true,
        },
      });
    default:
      throw new Error("Unknown settings kind");
  }
}

export async function POST(req: Request, { params }: { params: { kind: string } }) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized", code: "AUTH" }, { status: 401 });
    const guard = await requireSettingsWrite(userId);
    if (!guard.ok) return guard.response;

    const key = readIdempotencyKey(req);
    if (!key) return NextResponse.json({ error: "Idempotency-Key header is required" }, { status: 400 });
    const prior = await findPriorIdempotentEntityId(entityType(params.kind), key);
    if (prior) return NextResponse.json({ id: prior, idempotentReplay: true });

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid settings payload", details: parsed.error.flatten() }, { status: 422 });
    }

    let row: any;
    try {
      row = await createMaster(params.kind, parsed.data);
    } catch (error: any) {
      return NextResponse.json({ error: error?.message ?? "Invalid settings payload" }, { status: 400 });
    }

    await recordMobileAudit({
      userId,
      entityType: entityType(params.kind),
      entityId: row.id,
      action: "CREATE",
      metadata: { idempotencyKey: key, kind: params.kind },
    });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.log("[MOBILE_SETTINGS_MASTER_POST]", error);
    return NextResponse.json({ error: "Internal error", code: "SERVER" }, { status: 500 });
  }
}

