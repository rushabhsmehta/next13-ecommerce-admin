import prismadb from "@/lib/prismadb";
import { notFound } from "next/navigation";
import { PackageDetailClient } from "./components/package-detail-client";

export const dynamic = "force-dynamic";

export default async function PackageDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  // Try finding by slug first, then by ID
  let tourPackage = await prismadb.tourPackage.findFirst({
    where: { slug: params.slug, isArchived: false },
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
      where: { id: params.slug, isArchived: false },
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
      location: { select: { label: true } },
      images: { select: { url: true }, take: 1 },
      _count: { select: { itineraries: true } },
    },
    take: 3,
  });

  return <PackageDetailClient tourPackage={tourPackage} relatedPackages={relatedPackages} />;
}
