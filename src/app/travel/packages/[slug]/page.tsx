import type { Metadata } from "next";
import prismadb from "@/lib/prismadb";
import { notFound } from "next/navigation";
import { PackageDetailClient } from "./components/package-detail-client";
import { PACKAGE_OFFER_FIELDS, buildPublicOfferPayload } from "@/lib/package-offers";
import { formatPackageDisplayName, plainPackageTitle } from "@/lib/travel-display";
import { JsonLd } from "../../components/json-ld";
import { buildTouristTripJsonLd } from "@/lib/travel-structured-data";

export const revalidate = 300;

const packageInclude = {
  location: true,
  images: true,
  itineraries: {
    include: {
      itineraryImages: true,
      activities: {
        include: { activityImages: true },
      },
      hotel: {
        include: { images: true },
      },
    },
    orderBy: [{ dayNumber: "asc" as const }, { days: "asc" as const }],
  },
  flightDetails: true,
};

async function findFeaturedTourPackage(slug: string) {
  let tourPackage = await prismadb.tourPackage.findFirst({
    where: { slug, isFeatured: true, isArchived: false },
    include: packageInclude,
  });

  if (!tourPackage) {
    tourPackage = await prismadb.tourPackage.findFirst({
      where: { id: slug, isFeatured: true, isArchived: false },
      include: packageInclude,
    });
  }

  return tourPackage;
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const tourPackage = await findFeaturedTourPackage(params.slug);

  if (!tourPackage) {
    return { title: "Package Not Found | Aagam Holidays" };
  }

  const title = formatPackageDisplayName(tourPackage.tourPackageName);
  const location = tourPackage.location?.label;
  const description = [
    tourPackage.numDaysNight,
    location ? `in ${location}` : null,
    "— view itinerary, inclusions, and request a quote from Aagam Holidays.",
  ]
    .filter(Boolean)
    .join(" ");

  const imageUrl = tourPackage.images[0]?.url;

  return {
    title: `${title} | Aagam Holidays`,
    description,
    openGraph: {
      title: `${plainPackageTitle(tourPackage.tourPackageName)} | Aagam Holidays`,
      description,
      type: "website",
      ...(imageUrl ? { images: [{ url: imageUrl }] } : {}),
    },
  };
}

export default async function PackageDetailPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const now = new Date();
  const params = await props.params;
  const tourPackage = await findFeaturedTourPackage(params.slug);

  if (!tourPackage) {
    notFound();
  }

  const relatedPackages = await prismadb.tourPackage.findMany({
    where: {
      locationId: tourPackage.locationId,
      id: { not: tourPackage.id },
      isFeatured: true,
      isArchived: false,
    },
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
    take: 3,
  });

  const jsonLd = buildTouristTripJsonLd({
    name: tourPackage.tourPackageName,
    slug: tourPackage.slug,
    id: tourPackage.id,
    locationLabel: tourPackage.location?.label,
    duration: tourPackage.numDaysNight,
    imageUrl: tourPackage.images[0]?.url,
  });

  return (
    <>
      <JsonLd data={jsonLd} />
      <PackageDetailClient
      tourPackage={{
        ...tourPackage,
        ...buildPublicOfferPayload(tourPackage, now),
      }}
      relatedPackages={relatedPackages.map((pkg) => ({
        ...pkg,
        ...buildPublicOfferPayload(pkg, now),
      }))}
    />
    </>
  );
}
