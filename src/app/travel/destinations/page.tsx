import prismadb from "@/lib/prismadb";
import { DestinationCard } from "../components/destination-card";

export const dynamic = "force-dynamic";

export default async function DestinationsPage() {
  const destinations = await prismadb.location.findMany({
    where: { isActive: true },
    select: {
      id: true,
      label: true,
      imageUrl: true,
      slug: true,
      tags: true,
      _count: {
        select: {
          tourPackages: {
            where: { isFeatured: true, isArchived: false },
          },
        },
      },
    },
    orderBy: { label: "asc" },
  });

  const activeDestinations = destinations.filter(
    (d) => d._count.tourPackages > 0
  );

  return (
    <div className="min-h-screen pt-20 bg-gradient-to-b from-gray-50/80 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-12">
          <span className="text-orange-600 font-semibold text-sm uppercase tracking-wider">
            Explore
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mt-2">
            Explore Destinations
          </h1>
          <p className="text-gray-500 mt-3 max-w-2xl mx-auto text-sm sm:text-base">
            Choose from our handpicked destinations across the globe. Every
            destination promises a unique experience.
          </p>
        </div>

        {/* Destinations Grid */}
        {activeDestinations.length === 0 ? (
          <div className="text-center py-16 sm:py-20">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No destinations available yet
            </h3>
            <p className="text-gray-500 text-sm">Check back soon for new destinations.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {activeDestinations.map((destination) => (
              <DestinationCard
                key={destination.id}
                id={destination.id}
                name={destination.label}
                imageUrl={destination.imageUrl}
                packageCount={destination._count.tourPackages}
                slug={destination.slug}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
