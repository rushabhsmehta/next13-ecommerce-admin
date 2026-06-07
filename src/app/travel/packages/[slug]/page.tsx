import prismadb from "@/lib/prismadb";
import { notFound } from "next/navigation";
import { PackageDetailClient } from "./components/package-detail-client";
import { PACKAGE_OFFER_FIELDS, buildPublicOfferPayload } from "@/lib/package-offers";

export const revalidate = 300;
export const metadata = {
  title: "Tour Package Details | Aagam Holidays",
  description:
    "View itinerary details, inclusions, pricing, and related packages for a selected Aagam Holidays tour.",
};

export default async function PackageDetailPage(
  props: {
    params: Promise<{ slug: string }>;
  }
) {
  const now = new Date();
  const params = await props.params;
  // Try finding by slug first, then by ID
  let tourPackage = await prismadb.tourPackage.findFirst({
    where: { slug: params.slug, isFeatured: true, isArchived: false },
    include: {
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
        orderBy: [{ dayNumber: "asc" }, { days: "asc" }],
      },
      flightDetails: true,
    },
  });

  if (!tourPackage) {
    tourPackage = await prismadb.tourPackage.findFirst({
      where: { id: params.slug, isFeatured: true, isArchived: false },
      include: {
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
          orderBy: [{ dayNumber: "asc" }, { days: "asc" }],
        },
        flightDetails: true,
      },
    });
  }

  if (!tourPackage) {
    notFound();
  }

  // Get related packages
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

  return (
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
  );
}
