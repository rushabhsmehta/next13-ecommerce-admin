import prismadb from "@/lib/prismadb";
import { HeroSection } from "./components/hero-section";
import { FeaturedDestinations } from "./components/featured-destinations";
import { FeaturedPackages } from "./components/featured-packages";
import { WhyChooseUs } from "./components/why-choose-us";

export const dynamic = "force-dynamic";

export default async function TravelHomePage() {
  const [destinations, featuredPackages] = await Promise.all([
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
        location: { select: { label: true } },
        images: { select: { url: true }, take: 1 },
        _count: { select: { itineraries: true } },
      },
      orderBy: [{ websiteSortOrder: "asc" }, { createdAt: "desc" }],
      take: 6,
    }),
  ]);

  const activeDestinations = destinations.filter(
    (d) => d._count.tourPackages > 0
  );

  return (
    <div className="min-h-screen">
      <HeroSection />
      <FeaturedDestinations destinations={activeDestinations} />
      <FeaturedPackages packages={featuredPackages} />
      <WhyChooseUs />
    </div>
  );
}
