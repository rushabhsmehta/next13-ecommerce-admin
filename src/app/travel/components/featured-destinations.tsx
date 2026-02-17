import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DestinationCard } from "./destination-card";

interface Destination {
  id: string;
  label: string;
  imageUrl: string;
  slug: string | null;
  _count: { tourPackages: number };
}

export function FeaturedDestinations({
  destinations,
}: {
  destinations: Destination[];
}) {
  if (destinations.length === 0) return null;

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-12">
          <div>
            <span className="text-emerald-600 font-semibold text-sm uppercase tracking-wider">
              Explore
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-2">
              Popular Destinations
            </h2>
            <p className="text-gray-500 mt-3 max-w-lg">
              Discover breathtaking locations curated just for you. From serene
              beaches to majestic mountains.
            </p>
          </div>
          <Link
            href="/travel/destinations"
            className="mt-4 sm:mt-0 inline-flex items-center gap-2 text-emerald-600 font-semibold hover:gap-3 transition-all"
          >
            View All Destinations <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Destination Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinations.slice(0, 6).map((destination) => (
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
      </div>
    </section>
  );
}
