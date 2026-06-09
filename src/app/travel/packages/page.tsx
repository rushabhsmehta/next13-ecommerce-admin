import prismadb from "@/lib/prismadb";
import { PackagesListClient } from "./components/packages-list-client";
import {
  PACKAGE_OFFER_FIELDS,
  activeOfferOrderBy,
  activeOfferWhere,
  buildPublicOfferPayload,
} from "@/lib/package-offers";
import {
  parseTravelMonthParam,
  parseTravelSeasonParam,
  resolveSeasonalLocationFilter,
  type TravelSeasonFilterValue,
} from "@/lib/travel-season-filter";

export const revalidate = 300;

export const PAGE_SIZE = 24;

export const metadata = {
  title: "Tour Packages | Aagam Holidays",
  description:
    "Search, filter, and compare curated tour packages from Aagam Holidays.",
};

function parsePageParam(value: string | string[] | undefined): number {
  const raw = typeof value === "string" ? value : undefined;
  const parsed = Number.parseInt(raw || "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function PackagesPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const now = new Date();
  const searchParams = await props.searchParams;
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
  const offerOnly =
    typeof searchParams.offer === "string" &&
    ["1", "true"].includes(searchParams.offer.toLowerCase());
  const page = parsePageParam(searchParams.page);
  const travelMonth = parseTravelMonthParam(searchParams.month);
  const travelSeason: TravelSeasonFilterValue | undefined = travelMonth
    ? parseTravelSeasonParam(searchParams.season) ?? "best"
    : undefined;
  const skip = (page - 1) * PAGE_SIZE;

  const where: any = offerOnly
    ? activeOfferWhere(now)
    : {
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

  let seasonFilterActive = false;
  if (travelMonth) {
    const seasonalPeriods = await prismadb.locationSeasonalPeriod.findMany({
      where: { isActive: true },
      select: {
        id: true,
        locationId: true,
        seasonType: true,
        name: true,
        startMonth: true,
        startDay: true,
        endMonth: true,
        endDay: true,
        isActive: true,
      },
    });

    if (seasonalPeriods.length > 0) {
      const { matchingLocationIds, configuredLocationIds } =
        resolveSeasonalLocationFilter(
          seasonalPeriods,
          travelMonth,
          travelSeason ?? "best"
        );

      seasonFilterActive = true;
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { locationId: { in: matchingLocationIds } },
            { locationId: { notIn: configuredLocationIds } },
          ],
        },
      ];
    }
  }

  const [packages, totalCount, locations, categories] = await Promise.all([
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
        ...PACKAGE_OFFER_FIELDS,
        location: { select: { id: true, label: true } },
        images: { select: { url: true }, take: 1 },
        _count: { select: { itineraries: true } },
      },
      orderBy: offerOnly
        ? activeOfferOrderBy
        : [{ websiteSortOrder: "asc" }, { createdAt: "desc" }],
      take: PAGE_SIZE,
      skip,
    }),
    prismadb.tourPackage.count({ where }),
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

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const uniqueCategories = categories
    .map((c) => c.tourCategory)
    .filter(Boolean) as string[];

  return (
    <div className="min-h-screen pt-20 bg-gray-50">
      <PackagesListClient
        packages={packages.map((pkg) => ({
          ...pkg,
          ...buildPublicOfferPayload(pkg, now),
        }))}
        locations={locations}
        categories={uniqueCategories}
        initialCategory={category}
        initialSearch={search}
        initialLocation={locationId}
        initialOffer={offerOnly}
        initialMonth={travelMonth}
        initialSeason={travelSeason}
        seasonFilterActive={seasonFilterActive}
        totalCount={totalCount}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
