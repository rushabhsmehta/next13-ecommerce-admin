import prismadb from "@/lib/prismadb";
import { z } from "zod";
import type { ToolHandlerMap } from "../lib/schemas";

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

// ── Handlers ─────────────────────────────────────────────────────────────────

async function searchLocations(rawParams: unknown) {
  const params = SearchLocationsSchema.parse(rawParams);
  const { query, limit } = params;
  return prismadb.location.findMany({
    where: {
      isActive: true,
      label: { contains: query },
    },
    select: { id: true, label: true, value: true, slug: true },
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
    select: { id: true, name: true, description: true, locationId: true },
    take: limit,
  });
}

// ── Export ────────────────────────────────────────────────────────────────────

export const locationHandlers: ToolHandlerMap = {
  search_locations: searchLocations,
  list_tour_packages: listTourPackages,
  list_hotels: listHotels,
  list_destinations: listDestinations,
};
