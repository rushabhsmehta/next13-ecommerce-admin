import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireSettingsWrite } from "@/app/api/mobile/lib/assert-settings-access";
import { findPriorIdempotentEntityId, readIdempotencyKey } from "@/app/api/mobile/lib/finance-guard";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

const orgSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  gstNumber: z.string().optional().nullable(),
  panNumber: z.string().optional().nullable(),
  tanNumber: z.string().optional().nullable(),
  invoicePrefix: z.string().optional().nullable(),
  nextInvoiceNumber: z.coerce.number().int().min(1).optional(),
  billPrefix: z.string().optional().nullable(),
  nextBillNumber: z.coerce.number().int().min(1).optional(),
  defaultCurrency: z.string().optional().nullable(),
  tdsDeductorType: z.string().optional().nullable(),
  tdsSignatoryName: z.string().optional().nullable(),
  tdsSignatoryTitle: z.string().optional().nullable(),
});

export async function PATCH(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized", code: "AUTH" }, { status: 401 });
    const guard = await requireSettingsWrite(userId);
    if (!guard.ok) return guard.response;

    const key = readIdempotencyKey(req);
    if (!key) return NextResponse.json({ error: "Idempotency-Key header is required" }, { status: 400 });
    const prior = await findPriorIdempotentEntityId("OrganizationSettings", key);
    if (prior) return NextResponse.json({ id: prior, idempotentReplay: true });

    const parsed = orgSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid organization payload", details: parsed.error.flatten() }, { status: 422 });
    }

    const existing = await prismadb.organization.findFirst({ select: { id: true } });
    const organization = existing
      ? await prismadb.organization.update({ where: { id: existing.id }, data: parsed.data })
      : await prismadb.organization.create({ data: parsed.data });

    await recordMobileAudit({
      userId,
      entityType: "OrganizationSettings",
      entityId: organization.id,
      action: existing ? "UPDATE" : "CREATE",
      metadata: { idempotencyKey: key, fields: Object.keys(parsed.data) },
    });

    return NextResponse.json(organization);
  } catch (error) {
    console.log("[MOBILE_SETTINGS_ORG_PATCH]", error);
    return NextResponse.json({ error: "Internal error", code: "SERVER" }, { status: 500 });
  }
}

