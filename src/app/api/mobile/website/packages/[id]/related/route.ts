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

const DEFAULT_RELATION_TYPE = "related";

const updateSchema = z.object({
  relatedIds: z.array(z.string().min(1)),
  relationType: z.string().trim().min(1).optional(),
});

function formatRelation(row: any) {
  return {
    id: row.id,
    relatedTourPackageId: row.relatedTourPackageId,
    relationType: row.relationType,
    sortOrder: row.sortOrder ?? 0,
    relatedPackage: row.relatedTourPackage
      ? {
          id: row.relatedTourPackage.id,
          name: row.relatedTourPackage.tourPackageName ?? "Untitled Package",
          locationId: row.relatedTourPackage.locationId,
          isArchived: row.relatedTourPackage.isArchived,
          websiteSortOrder: row.relatedTourPackage.websiteSortOrder ?? 0,
        }
      : null,
  };
}

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized", code: "AUTH" }, { status: 401 });
    }
    const guard = await requireMobileAdminPermission(userId, "website.read");
    if (!guard.ok) return guard.response;

    const relations = await prismadb.tourPackageRelation.findMany({
      where: { tourPackageId: params.id, relationType: DEFAULT_RELATION_TYPE },
      include: {
        relatedTourPackage: {
          select: {
            id: true,
            tourPackageName: true,
            locationId: true,
            isArchived: true,
            websiteSortOrder: true,
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ relations: relations.map(formatRelation) });
  } catch (error) {
    console.log("[MOBILE_WEBSITE_RELATED_GET]", error);
    return NextResponse.json({ error: "Internal error", code: "SERVER" }, { status: 500 });
  }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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

    const prior = await findPriorIdempotentEntityId("TourPackageWebsiteRelated", key);
    if (prior) {
      return NextResponse.json({ success: true, packageId: prior, idempotentReplay: true });
    }

    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid related package payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const source = await prismadb.tourPackage.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!source) {
      return NextResponse.json({ error: "Tour package not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const sanitizedIds = Array.from(
      new Set(parsed.data.relatedIds.filter((id) => id.trim().length > 0 && id !== params.id))
    );
    const targets = sanitizedIds.length
      ? await prismadb.tourPackage.findMany({
          where: { id: { in: sanitizedIds } },
          select: { id: true, isArchived: true },
        })
      : [];

    if (targets.length !== sanitizedIds.length) {
      return NextResponse.json(
        { error: "One or more related tour packages were not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
    if (targets.some((pkg) => pkg.isArchived)) {
      return NextResponse.json(
        { error: "Archived tour packages cannot be added as related", code: "ARCHIVED_TARGET" },
        { status: 400 }
      );
    }

    const relationType = parsed.data.relationType || DEFAULT_RELATION_TYPE;
    await prismadb.$transaction([
      prismadb.tourPackageRelation.deleteMany({
        where: { tourPackageId: params.id, relationType },
      }),
      ...sanitizedIds.map((relatedId, sortOrder) =>
        prismadb.tourPackageRelation.create({
          data: {
            tourPackageId: params.id,
            relatedTourPackageId: relatedId,
            relationType,
            sortOrder,
          },
        })
      ),
    ]);

    await recordMobileAudit({
      userId,
      entityType: "TourPackageWebsiteRelated",
      entityId: params.id,
      action: "UPDATE",
      metadata: {
        idempotencyKey: key,
        relationType,
        relatedIds: sanitizedIds,
      },
    });

    return NextResponse.json({ success: true, relatedIds: sanitizedIds });
  } catch (error) {
    console.log("[MOBILE_WEBSITE_RELATED_PUT]", error);
    return NextResponse.json({ error: "Internal error", code: "SERVER" }, { status: 500 });
  }
}

