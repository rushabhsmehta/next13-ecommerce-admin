import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export const revalidate = 300;

const PACKAGE_SELECT = {
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
} as const;

const baseWhere = {
  isFeatured: true,
  isArchived: false,
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const maxLocations = Math.min(
      Math.max(parseInt(searchParams.get("maxLocations") || "12", 10), 1),
      20
    );
    const packagesPerLocation = Math.min(
      Math.max(parseInt(searchParams.get("packagesPerLocation") || "8", 10), 1),
      20
    );

    const [destinations, categoryGroups, featuredPackageCount] = await Promise.all([
      prismadb.location.findMany({
        where: { isActive: true },
        select: {
          id: true,
          label: true,
          imageUrl: true,
          slug: true,
          tags: true,
          _count: {
            select: {
              tourPackages: { where: baseWhere },
            },
          },
        },
        orderBy: { label: "asc" },
      }),
      prismadb.tourPackage.groupBy({
        by: ["tourCategory"],
        where: { ...baseWhere, tourCategory: { not: null } },
      }),
      prismadb.tourPackage.count({ where: baseWhere }),
    ]);

    const activeDestinations = destinations.filter(
      (d) => d._count.tourPackages > 0
    );

    const topDestinations = [...activeDestinations]
      .sort(
        (a, b) =>
          b._count.tourPackages - a._count.tourPackages ||
          a.label.localeCompare(b.label)
      )
      .slice(0, maxLocations);

    const topDestIds = topDestinations.map((d) => d.id);

    let locationCarousels: Array<{
      id: string;
      label: string;
      slug: string | null;
      packages: unknown[];
    }> = [];

    if (topDestIds.length > 0) {
      const allPackages = await prismadb.tourPackage.findMany({
        where: { ...baseWhere, locationId: { in: topDestIds } },
        select: PACKAGE_SELECT,
        orderBy: [{ websiteSortOrder: "asc" }, { createdAt: "desc" }],
      });

      const packagesByLocation = new Map<string, typeof allPackages>();
      for (const pkg of allPackages) {
        const locId = pkg.location.id;
        const list = packagesByLocation.get(locId) ?? [];
        if (list.length < packagesPerLocation) {
          list.push(pkg);
          packagesByLocation.set(locId, list);
        }
      }

      locationCarousels = topDestinations
        .map((dest) => {
          const packages = packagesByLocation.get(dest.id) ?? [];
          if (packages.length === 0) return null;
          return {
            id: dest.id,
            label: dest.label,
            slug: dest.slug,
            packages,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);
    }

    const categories = categoryGroups
      .map((g) => g.tourCategory)
      .filter((c): c is string => Boolean(c))
      .sort((a, b) => a.localeCompare(b));

    return NextResponse.json({
      destinations: activeDestinations,
      categories,
      featuredPackageCount,
      locationCarousels,
    });
  } catch (error) {
    console.log("[TRAVEL_HOME_FEED_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
