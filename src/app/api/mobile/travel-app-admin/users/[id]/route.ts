import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireMobileAdminPermission } from "@/app/api/mobile/lib/assert-mobile-admin-permission";
import { readIdempotencyKey } from "@/app/api/mobile/lib/finance-guard";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

const updateSchema = z
  .object({
    name: z.string().min(1).optional(),
    phone: z.string().optional().nullable(),
    avatarUrl: z.string().optional().nullable(),
    isApproved: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "At least one field is required",
  });

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized", code: "AUTH" }, { status: 401 });
    const guard = await requireMobileAdminPermission(userId, "travelAppAdmin.write");
    if (!guard.ok) return guard.response;
    const key = readIdempotencyKey(req);
    if (!key) return NextResponse.json({ error: "Idempotency-Key header is required" }, { status: 400 });

    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid travel user payload", details: parsed.error.flatten() }, { status: 422 });
    }

    const data: any = { ...parsed.data };
    if (typeof data.name === "string") data.name = data.name.trim();
    if (typeof data.phone === "string") data.phone = data.phone.trim() || null;
    if (typeof data.avatarUrl === "string") data.avatarUrl = data.avatarUrl.trim() || null;

    const updated = await prismadb.travelAppUser.update({ where: { id: params.id }, data });
    await recordMobileAudit({
      userId,
      entityType: "TravelAppUser",
      entityId: updated.id,
      action: "UPDATE",
      metadata: { idempotencyKey: key, fields: Object.keys(parsed.data) },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.log("[MOBILE_TRAVEL_USER_PATCH]", error);
    return NextResponse.json({ error: "Internal error", code: "SERVER" }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized", code: "AUTH" }, { status: 401 });
    const guard = await requireMobileAdminPermission(userId, "travelAppAdmin.write");
    if (!guard.ok) return guard.response;
    const key = readIdempotencyKey(req);
    if (!key) return NextResponse.json({ error: "Idempotency-Key header is required" }, { status: 400 });

    const updated = await prismadb.travelAppUser.update({
      where: { id: params.id },
      data: { isActive: false, isApproved: false },
    });
    await recordMobileAudit({
      userId,
      entityType: "TravelAppUser",
      entityId: updated.id,
      action: "DELETE",
      metadata: { idempotencyKey: key, deactivated: true },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.log("[MOBILE_TRAVEL_USER_DELETE]", error);
    return NextResponse.json({ error: "Internal error", code: "SERVER" }, { status: 500 });
  }
}

