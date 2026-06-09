import prismadb from "@/lib/prismadb";
import { DestinationCarousel } from "./components/destination-carousel";
import { TourCategories } from "./components/tour-categories";
import { FeaturedPackages } from "./components/featured-packages";
import { SpecialDeals } from "./components/special-deals";
import { PopularActivities } from "./components/popular-activities";
import { HowItWorks } from "./components/how-it-works";
import { StatsSection } from "./components/stats-section";
import { Testimonials } from "./components/testimonials";
import { InquiryCta } from "./components/inquiry-cta";
import { WhyChooseUs } from "./components/why-choose-us";
import {
  PACKAGE_OFFER_FIELDS,
  activeOfferOrderBy,
  activeOfferWhere,
  buildPublicOfferPayload,
} from "@/lib/package-offers";

export const revalidate = 300;
export const metadata = {
  title: "Travel Home | Aagam Holidays",
  description:
    "Discover handcrafted tour packages, featured destinations, and premium travel experiences from Aagam Holidays.",
};

export default async function TravelHomePage() {
  const now = new Date();
  const [
    destinations,
    featuredPackages,
    categories,
    deals,
    activities,
    [destinationCount, packageCount],
  ] = await Promise.all([
    prismadb.location.findMany({
      where: { isActive: true },
      select: {
        id: true,
        label: true,
        imageUrl: true,
        slug: true,
        _count: {
          select: {
            tourPackages: {
              where: { isFeatured: true, isArchived: false },
            },
          },
        },
      },
      orderBy: { label: "asc" },
    }),
    prismadb.tourPackage.findMany({
      where: { isFeatured: true, isArchived: false },
      select: {
        id: true,
        tourPackageName: true,
        slug: true,
        price: true,
        pricePerAdult: true,
        numDaysNight: true,
        tourCategory: true,
        ...PACKAGE_OFFER_FIELDS,
        location: { select: { label: true } },
        images: { select: { url: true }, take: 1 },
        _count: { select: { itineraries: true } },
      },
      orderBy: [{ websiteSortOrder: "asc" }, { createdAt: "desc" }],
      take: 6,
    }),

    // New: Tour categories
    prismadb.tourPackage.groupBy({
      by: ["tourCategory"],
      where: {
        isFeatured: true,
        isArchived: false,
        tourCategory: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),

    // Special deals are now explicit active offers.
    prismadb.tourPackage.findMany({
      where: activeOfferWhere(now),
      select: {
        id: true,
        tourPackageName: true,
        slug: true,
        price: true,
        pricePerAdult: true,
        numDaysNight: true,
        tourCategory: true,
        ...PACKAGE_OFFER_FIELDS,
        location: { select: { label: true } },
        images: { select: { url: true }, take: 1 },
        _count: { select: { itineraries: true } },
      },
      orderBy: activeOfferOrderBy,
      take: 4,
    }),

    // New: Popular activities with images
    prismadb.activityMaster.findMany({
      where: { activityMasterImages: { some: {} } },
      select: {
        id: true,
        activityMasterTitle: true,
        activityMasterImages: { select: { url: true }, take: 1 },
        location: { select: { id: true, label: true, slug: true } },
      },
      take: 8,
    }),
    Promise.all([
      prismadb.location.count({ where: { isActive: true } }),
      prismadb.tourPackage.count({ where: { isArchived: false } }),
    ]),
  ]);

  const activeDestinations = destinations.filter(
    (d) => d._count.tourPackages > 0
  );

  const filteredActivities = activities.filter(
    (a): a is typeof a & { activityMasterTitle: string } =>
      a.activityMasterTitle !== null
  );

  return (
    <div className="min-h-screen bg-white pt-20 sm:pt-24">
      <DestinationCarousel destinations={activeDestinations} />
      <TourCategories categories={categories} />
      <FeaturedPackages
        packages={featuredPackages.map((pkg) => ({
          ...pkg,
          ...buildPublicOfferPayload(pkg, now),
        }))}
      />
      <SpecialDeals
        deals={deals.map((pkg) => ({
          ...pkg,
          ...buildPublicOfferPayload(pkg, now),
        }))}
      />
      <PopularActivities activities={filteredActivities} />
      <HowItWorks />
      <StatsSection
        destinationCount={destinationCount}
        packageCount={packageCount}
      />
      <Testimonials />
      <InquiryCta />
      <WhyChooseUs />
    </div>
  );
}
