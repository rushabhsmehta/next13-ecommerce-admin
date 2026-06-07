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
    const query = searchParams.get("q") || "";

    if (!query || query.length < 2) {
      return NextResponse.json({ results: { packages: [], destinations: [] } });
    }

    const searchConditions = [
      { tourPackageName: { contains: query } },
      { location: { label: { contains: query } } },
    ];

    const [offerPackages, regularPackages, destinations] = await Promise.all([
      prismadb.tourPackage.findMany({
        where: {
          ...activeOfferWhere(now),
          OR: searchConditions,
        },
        select: {
          id: true,
          tourPackageName: true,
          slug: true,
          numDaysNight: true,
          price: true,
          pricePerAdult: true,
          ...PACKAGE_OFFER_FIELDS,
          location: { select: { label: true } },
          images: { select: { url: true }, take: 1 },
        },
        orderBy: activeOfferOrderBy,
        take: 5,
      }),
      prismadb.tourPackage.findMany({
        where: {
          isFeatured: true,
          isArchived: false,
          OR: searchConditions,
        },
        select: {
          id: true,
          tourPackageName: true,
          slug: true,
          numDaysNight: true,
          price: true,
          pricePerAdult: true,
          ...PACKAGE_OFFER_FIELDS,
          location: { select: { label: true } },
          images: { select: { url: true }, take: 1 },
        },
        orderBy: [{ websiteSortOrder: "asc" }, { createdAt: "desc" }],
        take: 8,
      }),
      prismadb.location.findMany({
        where: {
          isActive: true,
          label: { contains: query },
        },
        select: {
          id: true,
          label: true,
          imageUrl: true,
          _count: {
            select: {
              tourPackages: { where: { isFeatured: true, isArchived: false } },
            },
          },
        },
        take: 3,
      }),
    ]);

    const packages = [
      ...offerPackages,
      ...regularPackages.filter((pkg) => !offerPackages.some((offer) => offer.id === pkg.id)),
    ].slice(0, 5);

    return NextResponse.json({
      results: {
        packages: packages.map((p) => ({
          type: "package" as const,
          id: p.id,
          name: p.tourPackageName,
          slug: p.slug,
          duration: p.numDaysNight,
          price: buildPublicOfferPayload(p, now).offerPrice || p.pricePerAdult || p.price,
          location: p.location.label,
          imageUrl: p.images[0]?.url,
          ...buildPublicOfferPayload(p, now),
        })),
        destinations: destinations
          .filter((d) => d._count.tourPackages > 0)
          .map((d) => ({
            type: "destination" as const,
            id: d.id,
            name: d.label,
            imageUrl: d.imageUrl,
            packageCount: d._count.tourPackages,
          })),
      },
    });
  } catch (error) {
    console.log("[TRAVEL_SEARCH_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
