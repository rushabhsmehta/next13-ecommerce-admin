import prismadb from "@/lib/prismadb";
import { z } from "zod";
import type { ToolHandlerMap } from "../lib/schemas";
import { NotFoundError } from "../lib/errors";

// ── Schemas ──────────────────────────────────────────────────────────────────

const SearchLocationsSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(50).optional().default(10),
});

const ListTourPackagesSchema = z.object({
  locationId: z.string().optional(),
  tourCategory: z.enum(["Domestic", "International"]).optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

const ListHotelsSchema = z.object({
  locationId: z.string().optional(),
  name: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

const ListDestinationsSchema = z.object({
  locationId: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
});

const GetTourPackageSchema = z.object({
  tourPackageId: z.string().min(1),
});

// ── Handlers ─────────────────────────────────────────────────────────────────

async function searchLocations(rawParams: unknown) {
  const params = SearchLocationsSchema.parse(rawParams);
  const { query, limit } = params;
  return prismadb.location.findMany({
    where: {
      isActive: true,
      label: { contains: query },
    },
    select: { id: true, label: true, imageUrl: true, value: true, slug: true },
    take: limit,
  });
}

async function listTourPackages(rawParams: unknown) {
  const params = ListTourPackagesSchema.parse(rawParams);
  const { locationId, tourCategory, limit } = params;
  return prismadb.tourPackage.findMany({
    where: {
      isArchived: false,
      ...(locationId && { locationId }),
      ...(tourCategory && { tourCategory: tourCategory as any }),
    },
    select: {
      id: true,
      tourPackageName: true,
      tourCategory: true,
      tourPackageType: true,
      numDaysNight: true,
      price: true,
      pricePerAdult: true,
      transport: true,
      pickup_location: true,
      drop_location: true,
      location: { select: { id: true, label: true } },
    },
    orderBy: { websiteSortOrder: "asc" },
    take: limit,
  });
}

async function listHotels(rawParams: unknown) {
  const params = ListHotelsSchema.parse(rawParams);
  const { locationId, name, limit } = params;
  return prismadb.hotel.findMany({
    where: {
      ...(locationId && { locationId }),
      ...(name && { name: { contains: name } }),
    },
    select: {
      id: true,
      name: true,
      link: true,
      location: { select: { id: true, label: true } },
    },
    take: limit,
  });
}

async function listDestinations(rawParams: unknown) {
  const { locationId, limit } = ListDestinationsSchema.parse(rawParams);
  return prismadb.tourDestination.findMany({
    where: { ...(locationId && { locationId }) },
    select: { id: true, name: true, description: true, imageUrl: true, locationId: true },
    take: limit,
  });
}

async function getTourPackage(rawParams: unknown) {
  const { tourPackageId } = GetTourPackageSchema.parse(rawParams);
  const pkg = await prismadb.tourPackage.findUnique({
    where: { id: tourPackageId },
    include: {
      location: { select: { id: true, label: true } },
      itineraries: {
        select: {
          id: true,
          dayNumber: true,
          itineraryTitle: true,
          hotel: { select: { id: true, name: true } },
          itineraryImages: { select: { id: true, url: true } },
        },
        orderBy: { dayNumber: "asc" },
      },
      packageVariants: {
        include: {
          variantHotelMappings: {
            include: {
              hotel: { select: { id: true, name: true } },
              itinerary: { select: { id: true, dayNumber: true, itineraryTitle: true } },
            },
          },
          tourPackagePricings: {
            where: { isActive: true },
            include: {
              mealPlan: { select: { id: true, name: true } },
              vehicleType: { select: { id: true, name: true } },
              pricingComponents: {
                include: { pricingAttribute: { select: { id: true, name: true } } },
              },
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!pkg) throw new NotFoundError(`Tour package ${tourPackageId} not found`);
  return pkg;
}

// ── Export ────────────────────────────────────────────────────────────────────

export const locationHandlers: ToolHandlerMap = {
  search_locations: searchLocations,
  list_tour_packages: listTourPackages,
  get_tour_package: getTourPackage,
  list_hotels: listHotels,
  list_destinations: listDestinations,
};
