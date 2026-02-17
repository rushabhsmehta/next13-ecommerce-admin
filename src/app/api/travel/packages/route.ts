import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("locationId") || undefined;
    const category = searchParams.get("category") || undefined;
    const search = searchParams.get("search") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const where: any = {
      isFeatured: true,
      isArchived: false,
    };

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
          location: { select: { id: true, label: true, imageUrl: true } },
          images: { select: { url: true }, take: 3 },
          _count: { select: { itineraries: true } },
        },
        orderBy: [{ websiteSortOrder: "asc" }, { createdAt: "desc" }],
        take: limit,
        skip: offset,
      }),
      prismadb.tourPackage.count({ where }),
    ]);

    return NextResponse.json({
      packages,
      total,
      limit,
      offset,
      hasMore: offset + packages.length < total,
    });
  } catch (error) {
    console.log("[TRAVEL_PACKAGES_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
