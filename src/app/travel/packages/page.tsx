import prismadb from "@/lib/prismadb";
import { PackagesListClient } from "./components/packages-list-client";

export const dynamic = "force-dynamic";

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const category =
    typeof searchParams.category === "string"
      ? searchParams.category
      : undefined;
  const search =
    typeof searchParams.search === "string" ? searchParams.search : undefined;
  const locationId =
    typeof searchParams.location === "string"
      ? searchParams.location
      : undefined;

  const where: any = {
    isFeatured: true,
    isArchived: false,
  };

  if (category) {
    where.tourCategory = category;
  }

  if (locationId) {
    where.locationId = locationId;
  }

  if (search) {
    where.OR = [
      { tourPackageName: { contains: search } },
      { location: { label: { contains: search } } },
    ];
  }

  const [packages, locations, categories] = await Promise.all([
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
        location: { select: { id: true, label: true } },
        images: { select: { url: true }, take: 1 },
        _count: { select: { itineraries: true } },
      },
      orderBy: [{ websiteSortOrder: "asc" }, { createdAt: "desc" }],
    }),
    prismadb.location.findMany({
      where: { isActive: true },
      select: { id: true, label: true },
      orderBy: { label: "asc" },
    }),
    prismadb.tourPackage.findMany({
      where: { isFeatured: true, isArchived: false, tourCategory: { not: null } },
      select: { tourCategory: true },
      distinct: ["tourCategory"],
    }),
  ]);

  const uniqueCategories = categories
    .map((c) => c.tourCategory)
    .filter(Boolean) as string[];

  return (
    <div className="min-h-screen pt-20 bg-gray-50">
      <PackagesListClient
        packages={packages}
        locations={locations}
        categories={uniqueCategories}
        initialCategory={category}
        initialSearch={search}
        initialLocation={locationId}
      />
    </div>
  );
}
