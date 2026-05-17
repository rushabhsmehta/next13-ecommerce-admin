import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireMobileAdminPermission } from "@/app/api/mobile/lib/assert-mobile-admin-permission";
import { findPriorIdempotentEntityId, readIdempotencyKey } from "@/app/api/mobile/lib/finance-guard";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  clerkUserId: z.string().optional().nullable(),
  isApproved: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized", code: "AUTH" }, { status: 401 });
    const guard = await requireMobileAdminPermission(userId, "travelAppAdmin.write");
    if (!guard.ok) return guard.response;

    const key = readIdempotencyKey(req);
    if (!key) return NextResponse.json({ error: "Idempotency-Key header is required" }, { status: 400 });
    const prior = await findPriorIdempotentEntityId("TravelAppUser", key);
    if (prior) return NextResponse.json({ id: prior, idempotentReplay: true });

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid travel user payload", details: parsed.error.flatten() }, { status: 422 });
    }
    const existing = await prismadb.travelAppUser.findUnique({ where: { email: parsed.data.email } });
    if (existing) return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });

    const user = await prismadb.travelAppUser.create({
      data: {
        name: parsed.data.name.trim(),
        email: parsed.data.email.trim().toLowerCase(),
        phone: parsed.data.phone?.trim() || null,
        clerkUserId: parsed.data.clerkUserId?.trim() || null,
        isApproved: parsed.data.isApproved,
      },
    });

    await recordMobileAudit({
      userId,
      entityType: "TravelAppUser",
      entityId: user.id,
      action: "CREATE",
      metadata: { idempotencyKey: key, email: user.email },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.log("[MOBILE_TRAVEL_USERS_POST]", error);
    return NextResponse.json({ error: "Internal error", code: "SERVER" }, { status: 500 });
  }
}

