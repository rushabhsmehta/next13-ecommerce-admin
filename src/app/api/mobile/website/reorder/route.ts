import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireMobileAdminPermission } from "@/app/api/mobile/lib/assert-mobile-admin-permission";
import {
  findPriorIdempotentEntityId,
  readIdempotencyKey,
} from "@/app/api/mobile/lib/finance-guard";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

const reorderSchema = z.object({
  locationId: z.string().optional().nullable(),
  orderedIds: z.array(z.string().min(1)).min(1),
});

export async function PATCH(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized", code: "AUTH" }, { status: 401 });
    }
    const guard = await requireMobileAdminPermission(userId, "website.write");
    if (!guard.ok) return guard.response;

    const key = readIdempotencyKey(req);
    if (!key) {
      return NextResponse.json(
        { error: "Idempotency-Key header is required", code: "IDEMPOTENCY_REQUIRED" },
        { status: 400 }
      );
    }

    const prior = await findPriorIdempotentEntityId("TourPackageWebsiteReorder", key);
    if (prior) {
      return NextResponse.json({ success: true, entityId: prior, idempotentReplay: true });
    }

    const parsed = reorderSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid website order payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const orderedIds = parsed.data.orderedIds;
    const uniqueIds = Array.from(new Set(orderedIds));
    if (uniqueIds.length !== orderedIds.length) {
      return NextResponse.json({ error: "orderedIds must not contain duplicates" }, { status: 400 });
    }

    const packages = await prismadb.tourPackage.findMany({
      where: { id: { in: orderedIds } },
      select: { id: true, locationId: true, isArchived: true },
    });
    if (packages.length !== orderedIds.length) {
      return NextResponse.json(
        { error: "One or more tour packages not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
    if (parsed.data.locationId) {
      const mismatched = packages.find((pkg) => pkg.locationId !== parsed.data.locationId);
      if (mismatched) {
        return NextResponse.json(
          { error: "All tour packages must belong to the specified location" },
          { status: 400 }
        );
      }
    }
    if (packages.some((pkg) => pkg.isArchived)) {
      return NextResponse.json(
        { error: "Archived tour packages cannot be reordered", code: "ARCHIVED_TARGET" },
        { status: 400 }
      );
    }

    await prismadb.$transaction(
      orderedIds.map((id, index) =>
        prismadb.tourPackage.update({
          where: { id },
          data: { websiteSortOrder: index },
        })
      )
    );

    const entityId = parsed.data.locationId ?? orderedIds[0];
    await recordMobileAudit({
      userId,
      entityType: "TourPackageWebsiteReorder",
      entityId,
      action: "UPDATE",
      metadata: {
        idempotencyKey: key,
        locationId: parsed.data.locationId ?? null,
        orderedIds,
      },
    });

    return NextResponse.json({ success: true, orderedIds });
  } catch (error) {
    console.log("[MOBILE_WEBSITE_REORDER_PATCH]", error);
    return NextResponse.json({ error: "Internal error", code: "SERVER" }, { status: 500 });
  }
}

