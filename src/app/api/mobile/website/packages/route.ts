import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireMobileAdminPermission } from "@/app/api/mobile/lib/assert-mobile-admin-permission";

export const dynamic = "force-dynamic";

function formatPackage(row: any) {
  return {
    id: row.id,
    name: row.tourPackageName ?? "Untitled Package",
    slug: row.slug,
    locationId: row.locationId,
    locationLabel: row.location?.label ?? "Unknown",
    locationSlug: row.location?.slug ?? null,
    isFeatured: row.isFeatured,
    isArchived: row.isArchived,
    websiteSortOrder: row.websiteSortOrder ?? 0,
    tourPackageType: row.tourPackageType,
    tourCategory: row.tourCategory,
    numDaysNight: row.numDaysNight,
    price: row.price,
    heroImageUrl: row.images?.[0]?.url ?? null,
    updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
    relatedPackages: (row.primaryRelatedPackages ?? [])
      .filter((relation: any) => relation.relatedTourPackage)
      .map((relation: any) => ({
        id: relation.relatedTourPackage.id,
        name: relation.relatedTourPackage.tourPackageName ?? "Untitled Package",
        locationId: relation.relatedTourPackage.locationId,
        isArchived: relation.relatedTourPackage.isArchived,
        websiteSortOrder: relation.relatedTourPackage.websiteSortOrder ?? 0,
        sortOrder: relation.sortOrder ?? 0,
      })),
  };
}

export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized", code: "AUTH" }, { status: 401 });
    }
    const guard = await requireMobileAdminPermission(userId, "website.read");
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const locationId = searchParams.get("locationId")?.trim() ?? "";
    const status = searchParams.get("status")?.trim() ?? "all";
    const limitRaw = Number.parseInt(searchParams.get("limit") ?? "50", 10);
    const offsetRaw = Number.parseInt(searchParams.get("offset") ?? "0", 10);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 50, 1), 100);
    const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0);

    const where: Prisma.TourPackageWhereInput = {};
    if (locationId) where.locationId = locationId;
    if (status === "published") {
      where.isFeatured = true;
      where.isArchived = false;
    } else if (status === "draft") {
      where.isFeatured = false;
      where.isArchived = false;
    } else if (status === "archived") {
      where.isArchived = true;
    } else if (status === "featured") {
      where.isFeatured = true;
    }
    if (search) {
      where.OR = [
        { tourPackageName: { contains: search } },
        { tourPackageType: { contains: search } },
        { tourCategory: { contains: search } },
        { location: { label: { contains: search } } },
      ];
    }

    const [rows, total, locations] = await Promise.all([
      prismadb.tourPackage.findMany({
        where,
        select: {
          id: true,
          tourPackageName: true,
          slug: true,
          locationId: true,
          isFeatured: true,
          isArchived: true,
          websiteSortOrder: true,
          tourPackageType: true,
          tourCategory: true,
          numDaysNight: true,
          price: true,
          updatedAt: true,
          location: { select: { id: true, label: true, slug: true } },
          images: {
            select: { url: true, createdAt: true },
            orderBy: { createdAt: "asc" },
            take: 1,
          },
          primaryRelatedPackages: {
            where: { relationType: "related" },
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
          },
        },
        orderBy: [
          { location: { label: "asc" } },
          { websiteSortOrder: "asc" },
          { updatedAt: "desc" },
        ],
        skip: offset,
        take: limit,
      }),
      prismadb.tourPackage.count({ where }),
      prismadb.location.findMany({
        select: { id: true, label: true, slug: true },
        orderBy: { label: "asc" },
      }),
    ]);

    return NextResponse.json({
      items: rows.map(formatPackage),
      locations,
      total,
      hasMore: offset + rows.length < total,
      nextOffset: offset + rows.length,
    });
  } catch (error) {
    console.log("[MOBILE_WEBSITE_PACKAGES_GET]", error);
    return NextResponse.json({ error: "Internal error", code: "SERVER" }, { status: 500 });
  }
}

