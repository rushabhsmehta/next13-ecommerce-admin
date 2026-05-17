import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from "@/lib/timezone-utils";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireMobileAdminPermission } from "@/app/api/mobile/lib/assert-mobile-admin-permission";
import { findPriorIdempotentEntityId, readIdempotencyKey } from "@/app/api/mobile/lib/finance-guard";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

const groupSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  tourPackageQueryId: z.string().optional().nullable(),
  tourStartDate: z.string().optional().nullable(),
  tourEndDate: z.string().optional().nullable(),
  memberIds: z.array(z.object({ userId: z.string().min(1), role: z.string().optional() })).optional(),
});

export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized", code: "AUTH" }, { status: 401 });
    const guard = await requireMobileAdminPermission(userId, "travelAppAdmin.write");
    if (!guard.ok) return guard.response;

    const key = readIdempotencyKey(req);
    if (!key) return NextResponse.json({ error: "Idempotency-Key header is required" }, { status: 400 });
    const prior = await findPriorIdempotentEntityId("ChatGroup", key);
    if (prior) return NextResponse.json({ id: prior, idempotentReplay: true });

    const parsed = groupSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid chat group payload", details: parsed.error.flatten() }, { status: 422 });
    }

    const validRoles = ["ADMIN", "OPERATIONS", "TOURIST", "COMPANION"];
    const group = await prismadb.chatGroup.create({
      data: {
        name: parsed.data.name.trim(),
        description: parsed.data.description?.trim() || null,
        tourPackageQueryId: parsed.data.tourPackageQueryId?.trim() || null,
        tourStartDate: parsed.data.tourStartDate ? dateToUtc(parsed.data.tourStartDate) : undefined,
        tourEndDate: parsed.data.tourEndDate ? dateToUtc(parsed.data.tourEndDate) : undefined,
        createdBy: userId,
        members: parsed.data.memberIds?.length
          ? {
              createMany: {
                data: parsed.data.memberIds.map((member) => ({
                  travelAppUserId: member.userId,
                  role: validRoles.includes(member.role ?? "") ? (member.role as any) : "TOURIST",
                })),
                skipDuplicates: true,
              },
            }
          : undefined,
      },
    });

    await recordMobileAudit({
      userId,
      entityType: "ChatGroup",
      entityId: group.id,
      action: "CREATE",
      metadata: { idempotencyKey: key, memberCount: parsed.data.memberIds?.length ?? 0 },
    });
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.log("[MOBILE_TRAVEL_CHAT_GROUP_POST]", error);
    return NextResponse.json({ error: "Internal error", code: "SERVER" }, { status: 500 });
  }
}

