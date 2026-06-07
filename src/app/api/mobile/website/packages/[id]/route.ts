import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireMobileAdminPermission } from "@/app/api/mobile/lib/assert-mobile-admin-permission";
import {
  findPriorIdempotentEntityId,
  readIdempotencyKey,
} from "@/app/api/mobile/lib/finance-guard";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";
import { getPackageOfferStatus, parseOfferTerms } from "@/lib/package-offers";

export const dynamic = "force-dynamic";

const updateSchema = z
  .object({
    isFeatured: z.boolean().optional(),
    isArchived: z.boolean().optional(),
    websiteSortOrder: z.coerce.number().int().min(0).optional(),
    isOffer: z.boolean().optional(),
    offerTitle: z.string().trim().max(200).optional().nullable(),
    offerSubtitle: z.string().trim().max(1000).optional().nullable(),
    offerBadge: z.string().trim().max(80).optional().nullable(),
    offerPrice: z.string().trim().max(100).optional().nullable(),
    offerOriginalPrice: z.string().trim().max(100).optional().nullable(),
    offerStartsAt: z.coerce.date().optional().nullable(),
    offerEndsAt: z.coerce.date().optional().nullable(),
    offerSortOrder: z.coerce.number().int().min(0).optional(),
    offerTerms: z.array(z.string().trim().max(500)).optional().nullable(),
    tourPackageType: z.string().trim().min(1).optional().nullable(),
    tourCategory: z.string().trim().min(1).optional().nullable(),
    numDaysNight: z.string().trim().min(1).optional().nullable(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "At least one field is required",
  });

function formatPackage(row: any) {
  return {
    id: row.id,
    name: row.tourPackageName ?? "Untitled Package",
    slug: row.slug,
    locationId: row.locationId,
    locationLabel: row.location?.label ?? "Unknown",
    isFeatured: row.isFeatured,
    isArchived: row.isArchived,
    websiteSortOrder: row.websiteSortOrder ?? 0,
    isOffer: row.isOffer,
    offerStatus: getPackageOfferStatus(row),
    offerTitle: row.offerTitle,
    offerSubtitle: row.offerSubtitle,
    offerBadge: row.offerBadge,
    offerPrice: row.offerPrice,
    offerOriginalPrice: row.offerOriginalPrice,
    offerStartsAt: row.offerStartsAt?.toISOString?.() ?? row.offerStartsAt,
    offerEndsAt: row.offerEndsAt?.toISOString?.() ?? row.offerEndsAt,
    offerSortOrder: row.offerSortOrder ?? 0,
    offerTerms: parseOfferTerms(row.offerTerms),
    tourPackageType: row.tourPackageType,
    tourCategory: row.tourCategory,
    numDaysNight: row.numDaysNight,
    updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
  };
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
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

    const prior = await findPriorIdempotentEntityId("TourPackageWebsite", key);
    if (prior) {
      const existing = await prismadb.tourPackage.findUnique({
        where: { id: prior },
        include: { location: { select: { id: true, label: true } } },
      });
      return NextResponse.json({
        id: prior,
        package: existing ? formatPackage(existing) : null,
        idempotentReplay: true,
      });
    }

    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid website package payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const existing = await prismadb.tourPackage.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Tour package not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const updateData = {
      ...parsed.data,
      offerTerms:
        parsed.data.offerTerms === null
          ? Prisma.DbNull
          : parsed.data.offerTerms,
    };

    const updated = await prismadb.tourPackage.update({
      where: { id: params.id },
      data: updateData,
      include: { location: { select: { id: true, label: true } } },
    });

    await recordMobileAudit({
      userId,
      entityType: "TourPackageWebsite",
      entityId: updated.id,
      action: "UPDATE",
      metadata: {
        idempotencyKey: key,
        fields: Object.keys(parsed.data),
      },
    });

    return NextResponse.json(formatPackage(updated));
  } catch (error) {
    console.log("[MOBILE_WEBSITE_PACKAGE_PATCH]", error);
    return NextResponse.json({ error: "Internal error", code: "SERVER" }, { status: 500 });
  }
}
