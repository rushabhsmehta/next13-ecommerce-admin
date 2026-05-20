import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { buildMobileAdminProfile } from "@/lib/mobile-admin-access";
import { resolveInquiryAccessContext } from "@/lib/inquiry-access";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  read: z.boolean(),
});

async function loadProfile(userId: string) {
  const [membership, inquiryAccess] = await Promise.all([
    prismadb.organizationMember.findFirst({
      where: { userId, isActive: true },
      select: { role: true },
    }),
    resolveInquiryAccessContext(userId),
  ]);
  return buildMobileAdminProfile(membership?.role ?? null, inquiryAccess.isAssociate);
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized", code: "AUTH" }, { status: 401 });
    }
    const profile = await loadProfile(userId);
    if (!profile.permissions.includes("admin.dashboard.read")) {
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
    }

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const updated = await prismadb.notification.update({
      where: { id: params.id },
      data: { read: parsed.data.read },
    });
    return NextResponse.json({
      id: updated.id,
      type: updated.type,
      title: updated.title,
      message: updated.message,
      read: updated.read,
      data: updated.data,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.log("[MOBILE_NOTIFICATION_PATCH]", error);
    return NextResponse.json({ error: "Internal error", code: "SERVER" }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized", code: "AUTH" }, { status: 401 });
    }
    const profile = await loadProfile(userId);
    if (!profile.permissions.includes("admin.dashboard.read")) {
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
    }

    await prismadb.notification.delete({ where: { id: params.id } });
    await recordMobileAudit({
      userId,
      entityType: "Notification",
      entityId: params.id,
      action: "DELETE",
      metadata: { source: "mobile" },
    });
    return NextResponse.json({ success: true, id: params.id });
  } catch (error) {
    console.log("[MOBILE_NOTIFICATION_DELETE]", error);
    return NextResponse.json({ error: "Internal error", code: "SERVER" }, { status: 500 });
  }
}
