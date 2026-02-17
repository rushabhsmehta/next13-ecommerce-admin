import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PackageCard } from "./package-card";

interface FeaturedPackage {
  id: string;
  tourPackageName: string | null;
  slug: string | null;
  price: string | null;
  pricePerAdult: string | null;
  numDaysNight: string | null;
  tourCategory: string | null;
  location: { label: string };
  images: { url: string }[];
  _count: { itineraries: number };
}

export function FeaturedPackages({
  packages,
}: {
  packages: FeaturedPackage[];
}) {
  if (packages.length === 0) return null;

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-12">
          <div>
            <span className="text-emerald-600 font-semibold text-sm uppercase tracking-wider">
              Featured
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-2">
              Trending Tour Packages
            </h2>
            <p className="text-gray-500 mt-3 max-w-lg">
              Our most popular packages, handpicked by travel experts for an
              unforgettable experience.
            </p>
          </div>
          <Link
            href="/travel/packages"
            className="mt-4 sm:mt-0 inline-flex items-center gap-2 text-emerald-600 font-semibold hover:gap-3 transition-all"
          >
            View All Packages <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Package Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              id={pkg.id}
              name={pkg.tourPackageName || "Tour Package"}
              slug={pkg.slug}
              locationName={pkg.location.label}
              imageUrl={pkg.images[0]?.url || ""}
              duration={pkg.numDaysNight}
              price={pkg.price}
              pricePerAdult={pkg.pricePerAdult}
              tourCategory={pkg.tourCategory}
              itineraryCount={pkg._count.itineraries}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
