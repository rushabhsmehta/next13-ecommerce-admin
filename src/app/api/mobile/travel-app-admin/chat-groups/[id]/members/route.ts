import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireMobileAdminPermission } from "@/app/api/mobile/lib/assert-mobile-admin-permission";
import { readIdempotencyKey } from "@/app/api/mobile/lib/finance-guard";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

const memberSchema = z.object({
  travelAppUserId: z.string().min(1),
  role: z.enum(["ADMIN", "OPERATIONS", "TOURIST", "COMPANION"]).default("TOURIST"),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized", code: "AUTH" }, { status: 401 });
    const guard = await requireMobileAdminPermission(userId, "travelAppAdmin.write");
    if (!guard.ok) return guard.response;
    const key = readIdempotencyKey(req);
    if (!key) return NextResponse.json({ error: "Idempotency-Key header is required" }, { status: 400 });

    const parsed = memberSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid chat member payload", details: parsed.error.flatten() }, { status: 422 });
    }

    const member = await prismadb.chatGroupMember.upsert({
      where: {
        chatGroupId_travelAppUserId: {
          chatGroupId: params.id,
          travelAppUserId: parsed.data.travelAppUserId,
        },
      },
      update: { isActive: true, leftAt: null, role: parsed.data.role },
      create: {
        chatGroupId: params.id,
        travelAppUserId: parsed.data.travelAppUserId,
        role: parsed.data.role,
      },
    });
    await recordMobileAudit({
      userId,
      entityType: "ChatGroupMember",
      entityId: member.id,
      action: "CREATE",
      metadata: { idempotencyKey: key, chatGroupId: params.id, travelAppUserId: parsed.data.travelAppUserId },
    });
    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.log("[MOBILE_TRAVEL_CHAT_MEMBER_POST]", error);
    return NextResponse.json({ error: "Internal error", code: "SERVER" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized", code: "AUTH" }, { status: 401 });
    const guard = await requireMobileAdminPermission(userId, "travelAppAdmin.write");
    if (!guard.ok) return guard.response;
    const key = readIdempotencyKey(req);
    if (!key) return NextResponse.json({ error: "Idempotency-Key header is required" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const travelAppUserId = searchParams.get("travelAppUserId");
    if (!travelAppUserId) return NextResponse.json({ error: "travelAppUserId is required" }, { status: 400 });

    const member = await prismadb.chatGroupMember.update({
      where: {
        chatGroupId_travelAppUserId: {
          chatGroupId: params.id,
          travelAppUserId,
        },
      },
      data: { isActive: false, leftAt: new Date() },
    });
    await recordMobileAudit({
      userId,
      entityType: "ChatGroupMember",
      entityId: member.id,
      action: "DELETE",
      metadata: { idempotencyKey: key, chatGroupId: params.id, travelAppUserId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.log("[MOBILE_TRAVEL_CHAT_MEMBER_DELETE]", error);
    return NextResponse.json({ error: "Internal error", code: "SERVER" }, { status: 500 });
  }
}

