import Link from "next/link";
import { ArrowLeft, Tag } from "lucide-react";
import prismadb from "@/lib/prismadb";
import { PackageCard } from "../components/package-card";
import {
  PACKAGE_OFFER_FIELDS,
  activeOfferOrderBy,
  activeOfferWhere,
  buildPublicOfferPayload,
} from "@/lib/package-offers";

export const revalidate = 300;

export const metadata = {
  title: "Travel Offers | Aagam Holidays",
  description:
    "Browse active limited-period tour package offers and seasonal travel deals from Aagam Holidays.",
};

export default async function TravelOffersPage() {
  const now = new Date();
  const offers = await prismadb.tourPackage.findMany({
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
  });

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <Link
          href="/travel/packages"
          className="inline-flex items-center gap-2 text-sm font-semibold text-orange-700 hover:text-orange-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to packages
        </Link>

        <div className="mt-6 mb-8 sm:mb-10">
          <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-amber-700">
            <Tag className="h-4 w-4" />
            Active Offers
          </span>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">
            Tour Package Offers
          </h1>
          <p className="mt-3 max-w-2xl text-sm sm:text-base text-gray-500">
            Seasonal specials and limited-period prices on handpicked Aagam Holidays packages.
          </p>
        </div>

        {offers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-amber-200 bg-white p-10 text-center">
            <h2 className="text-lg font-semibold text-gray-900">No active offers right now</h2>
            <p className="mt-2 text-sm text-gray-500">
              Check back soon, or browse all tour packages for current availability.
            </p>
            <Link
              href="/travel/packages"
              className="mt-5 inline-flex rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
            >
              Browse packages
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {offers.map((pkg) => {
              const offer = buildPublicOfferPayload(pkg, now);
              return (
                <PackageCard
                  key={pkg.id}
                  id={pkg.id}
                  name={offer.offerTitle || pkg.tourPackageName || "Tour Package"}
                  slug={pkg.slug}
                  locationName={pkg.location.label}
                  imageUrl={pkg.images[0]?.url || ""}
                  duration={pkg.numDaysNight}
                  price={pkg.price}
                  pricePerAdult={pkg.pricePerAdult}
                  tourCategory={pkg.tourCategory}
                  itineraryCount={pkg._count.itineraries}
                  isOfferActive={offer.isOfferActive}
                  offerBadge={offer.offerBadge}
                  offerPrice={offer.offerPrice}
                  offerOriginalPrice={offer.offerOriginalPrice}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
