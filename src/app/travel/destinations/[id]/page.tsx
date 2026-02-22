import prismadb from "@/lib/prismadb";
import { notFound } from "next/navigation";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { PackageCard } from "../../components/package-card";

export const dynamic = "force-dynamic";

export default async function DestinationDetailPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const location = await prismadb.location.findUnique({
    where: { id: params.id },
    include: {
      tourPackages: {
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
      },
    },
  });

  if (!location || !location.isActive) {
    notFound();
  }

  return (
    <div className="min-h-screen pt-16">
      {/* Hero */}
      <div className="relative h-[40vh] sm:h-[50vh]">
        <Image
          src={location.imageUrl}
          alt={location.label}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 text-orange-300 mb-2">
              <MapPin className="w-5 h-5" />
              <span className="text-sm font-medium">Destination</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold text-white">
              {location.label}
            </h1>
            <p className="text-white/80 mt-2">
              {location.tourPackages.length}{" "}
              {location.tourPackages.length === 1 ? "Package" : "Packages"}{" "}
              Available
            </p>
          </div>
        </div>
      </div>

      {/* Packages */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8">
          Tour Packages in {location.label}
        </h2>

        {location.tourPackages.length === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No packages available yet
            </h3>
            <p className="text-gray-500 text-sm">
              We&apos;re working on exciting packages for this destination.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {location.tourPackages.map((pkg: any) => (
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
        )}
      </div>
    </div>
  );
}
