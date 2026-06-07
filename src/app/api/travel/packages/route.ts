import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import {
  PACKAGE_OFFER_FIELDS,
  activeOfferOrderBy,
  activeOfferWhere,
  buildPublicOfferPayload,
} from "@/lib/package-offers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const now = new Date();
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("locationId") || undefined;
    const category = searchParams.get("category") || undefined;
    const search = searchParams.get("search") || undefined;
    const offerOnly = ["1", "true"].includes((searchParams.get("offer") || "").toLowerCase());
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

    const baseWhere = {
      isFeatured: true,
      isArchived: false,
    };

    const where: any = offerOnly ? activeOfferWhere(now) : { ...baseWhere };

    if (locationId) where.locationId = locationId;
    if (category) where.tourCategory = category;
    if (search) {
      where.OR = [
        { tourPackageName: { contains: search } },
        { location: { label: { contains: search } } },
      ];
    }

    const [packages, total] = await Promise.all([
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
          ...PACKAGE_OFFER_FIELDS,
          location: { select: { id: true, label: true, imageUrl: true } },
          images: { select: { url: true }, take: 3 },
          _count: { select: { itineraries: true } },
        },
        orderBy: offerOnly ? activeOfferOrderBy : [{ websiteSortOrder: "asc" }, { createdAt: "desc" }],
        take: limit,
        skip: offset,
      }),
      prismadb.tourPackage.count({ where }),
    ]);

    // Fetch categories and featured count separately so a failure here
    // doesn't break the main package listing.
    let categories: string[] = [];
    let featuredPackageCount = 0;
    try {
      const [categoryGroups, count] = await Promise.all([
        prismadb.tourPackage.groupBy({
          by: ["tourCategory"],
          where: {
            ...baseWhere,
            tourCategory: { not: null },
          },
        }),
        prismadb.tourPackage.count({ where: baseWhere }),
      ]);
      categories = categoryGroups
        .map((g) => g.tourCategory)
        .filter((c): c is string => Boolean(c))
        .sort((a, b) => a.localeCompare(b));
      featuredPackageCount = count;
    } catch (err) {
      console.log("[TRAVEL_PACKAGES_GET] categories/count fetch failed:", err);
    }

    return NextResponse.json({
      packages: packages.map((pkg) => ({
        ...pkg,
        ...buildPublicOfferPayload(pkg, now),
      })),
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
