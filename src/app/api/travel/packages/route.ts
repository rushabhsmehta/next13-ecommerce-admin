import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("locationId") || undefined;
    const category = searchParams.get("category") || undefined;
    const search = searchParams.get("search") || undefined;
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

    const baseWhere = {
      isFeatured: true,
      isArchived: false,
    };

    const where: any = { ...baseWhere };

    if (locationId) where.locationId = locationId;
    if (category) where.tourCategory = category;
    if (search) {
      where.OR = [
        { tourPackageName: { contains: search } },
        { location: { label: { contains: search } } },
      ];
    }

    const [packages, total, categoryGroups, featuredPackageCount] = await Promise.all([
      prismadb.tourPackage.findMany({
        where,
        select: {
          id: true,
          tourPackageName: true,
          slug: true,
          price: true,
          pricePerAdult: true,
          numDaysNight: true,
          tourCategory: true,
          tourPackageType: true,
          pickup_location: true,
          drop_location: true,
          location: { select: { id: true, label: true, imageUrl: true } },
          images: { select: { url: true }, take: 3 },
          _count: { select: { itineraries: true } },
        },
        orderBy: [{ websiteSortOrder: "asc" }, { createdAt: "desc" }],
        take: limit,
        skip: offset,
      }),
      prismadb.tourPackage.count({ where }),
      prismadb.tourPackage.groupBy({
        by: ["tourCategory"],
        where: {
          ...baseWhere,
          tourCategory: { not: null },
        },
      }),
      prismadb.tourPackage.count({ where: baseWhere }),
    ]);

    const categories = categoryGroups
      .map((g) => g.tourCategory)
      .filter((c): c is string => Boolean(c))
      .sort((a, b) => a.localeCompare(b));

    return NextResponse.json({
      packages,
      total,
      limit,
      offset,
      hasMore: offset + packages.length < total,
      categories,
      featuredPackageCount,
    });
  } catch (error) {
    console.log("[TRAVEL_PACKAGES_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
