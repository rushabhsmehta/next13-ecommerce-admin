import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from "@/lib/timezone-utils";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireMobileAdminPermission } from "@/app/api/mobile/lib/assert-mobile-admin-permission";
import { readIdempotencyKey } from "@/app/api/mobile/lib/finance-guard";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

const updateSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    tourPackageQueryId: z.string().optional().nullable(),
    tourStartDate: z.string().optional().nullable(),
    tourEndDate: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "At least one field is required",
  });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized", code: "AUTH" }, { status: 401 });
    const guard = await requireMobileAdminPermission(userId, "travelAppAdmin.write");
    if (!guard.ok) return guard.response;
    const key = readIdempotencyKey(req);
    if (!key) return NextResponse.json({ error: "Idempotency-Key header is required" }, { status: 400 });

    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid chat group payload", details: parsed.error.flatten() }, { status: 422 });
    }

    const data: any = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name.trim();
    if (parsed.data.description !== undefined) data.description = parsed.data.description?.trim() || null;
    if (parsed.data.tourPackageQueryId !== undefined) data.tourPackageQueryId = parsed.data.tourPackageQueryId?.trim() || null;
    if (parsed.data.tourStartDate !== undefined) data.tourStartDate = parsed.data.tourStartDate ? dateToUtc(parsed.data.tourStartDate) : null;
    if (parsed.data.tourEndDate !== undefined) data.tourEndDate = parsed.data.tourEndDate ? dateToUtc(parsed.data.tourEndDate) : null;
    if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;

    const group = await prismadb.chatGroup.update({ where: { id: params.id }, data });
    await recordMobileAudit({
      userId,
      entityType: "ChatGroup",
      entityId: group.id,
      action: "UPDATE",
      metadata: { idempotencyKey: key, fields: Object.keys(parsed.data) },
    });
    return NextResponse.json(group);
  } catch (error) {
    console.log("[MOBILE_TRAVEL_CHAT_GROUP_PATCH]", error);
    return NextResponse.json({ error: "Internal error", code: "SERVER" }, { status: 500 });
  }
}

