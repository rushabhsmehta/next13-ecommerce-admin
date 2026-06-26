import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireMobileAdminPermission } from "@/app/api/mobile/lib/assert-mobile-admin-permission";
import {
  findPriorIdempotentEntityId,
  readIdempotencyKey,
} from "@/app/api/mobile/lib/finance-guard";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";
import {
  aiWizardSaveSchema,
  saveAiWizardDraft,
} from "@/lib/ai-wizard-persistence";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized", code: "AUTH" }, { status: 401 });
    }
    const guard = await requireMobileAdminPermission(userId, "aiWizards.write");
    if (!guard.ok) return guard.response;

    const key = readIdempotencyKey(req);
    if (!key) {
      return NextResponse.json(
        { error: "Idempotency-Key header is required", code: "IDEMPOTENCY_REQUIRED" },
        { status: 400 }
      );
    }

    const prior = await findPriorIdempotentEntityId("AiWizardSave", key);
    if (prior) {
      return NextResponse.json({ success: true, id: prior, idempotentReplay: true });
    }

    const parsed = aiWizardSaveSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid AI save payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const location = await prismadb.location.findUnique({
      where: { id: parsed.data.locationId },
      select: { id: true },
    });
    if (!location) {
      return NextResponse.json({ error: "Location not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const saved = await saveAiWizardDraft(prismadb, parsed.data);

    await recordMobileAudit({
      userId,
      entityType: "AiWizardSave",
      entityId: saved.id,
      action: "CREATE",
      metadata: {
        idempotencyKey: key,
        targetType: parsed.data.targetType,
        locationId: parsed.data.locationId,
      },
    });

    return NextResponse.json({
      success: true,
      targetType: saved.targetType,
      id: saved.id,
    });
  } catch (error) {
    console.log("[MOBILE_AI_SAVE_DRAFT_POST]", error);
    return NextResponse.json({ error: "Internal error", code: "SERVER" }, { status: 500 });
  }
}
