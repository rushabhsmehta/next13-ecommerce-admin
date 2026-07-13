import prismadb from "@/lib/prismadb";
import { z } from "zod";
import {
  findOverlappingBasePricings,
} from "@/lib/hotel-effective-pricing";
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

const GetHotelPricingSchema = z.object({
  hotelId: z.string().min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  roomTypeId: z.string().optional(),
  occupancyTypeId: z.string().optional(),
  mealPlanId: z.string().optional(),
});

const GetTransportPricingSchema = z.object({
  locationId: z.string().optional(),
  vehicleTypeId: z.string().optional(),
  transportType: z.enum(["PerDay", "PerTrip"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const CreateHotelPricingSchema = z.object({
  hotelId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  roomTypeId: z.string().min(1),
  occupancyTypeId: z.string().min(1),
  price: z.number().min(0),
  mealPlanId: z.string().optional(),
  locationSeasonalPeriodId: z.string().nullable().optional(),
});

const UpdateHotelPricingSchema = z.object({
  hotelId: z.string().min(1),
  pricingId: z.string().min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  roomTypeId: z.string().optional(),
  occupancyTypeId: z.string().optional(),
  price: z.number().min(0).optional(),
  mealPlanId: z.string().nullable().optional(),
  locationSeasonalPeriodId: z.string().nullable().optional(),
});

const DeleteHotelPricingSchema = z.object({
  hotelId: z.string().min(1),
  pricingId: z.string().min(1),
});

const CreateTransportPricingSchema = z.object({
  locationId: z.string().min(1),
  vehicleTypeId: z.string().min(1),
  price: z.number().min(0),
  transportType: z.enum(["PerDay", "PerTrip"]),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  description: z.string().optional(),
});

const UpdateTransportPricingSchema = z.object({
  pricingId: z.string().min(1),
  locationId: z.string().optional(),
  vehicleTypeId: z.string().optional(),
  price: z.number().min(0).optional(),
  transportType: z.enum(["PerDay", "PerTrip"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

const DeleteTransportPricingSchema = z.object({
  pricingId: z.string().min(1),
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

async function getHotelPricing(rawParams: unknown) {
  const { hotelId, startDate, endDate, roomTypeId, occupancyTypeId, mealPlanId } =
    GetHotelPricingSchema.parse(rawParams);

  const hotel = await prismadb.hotel.findUnique({
    where: { id: hotelId },
    select: { id: true, name: true },
  });
  if (!hotel) throw new NotFoundError(`Hotel ${hotelId} not found`);

  const pricings = await prismadb.hotelPricing.findMany({
    where: {
      hotelId,
      isActive: true,
      ...(roomTypeId && { roomTypeId }),
      ...(occupancyTypeId && { occupancyTypeId }),
      ...(mealPlanId && { mealPlanId }),
      ...(startDate && { endDate: { gte: new Date(startDate) } }),
      ...(endDate && { startDate: { lte: new Date(endDate) } }),
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      price: true,
      locationSeasonalPeriodId: true,
      roomType: { select: { id: true, name: true } },
      occupancyType: { select: { id: true, name: true, maxPersons: true } },
      mealPlan: { select: { id: true, name: true, code: true } },
      locationSeasonalPeriod: { select: { id: true, name: true, seasonType: true } },
    },
    orderBy: [{ startDate: "asc" }, { roomTypeId: "asc" }],
  });

  return { hotel, pricings };
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

async function getTransportPricing(rawParams: unknown) {
  const { locationId, vehicleTypeId, transportType, startDate, endDate } =
    GetTransportPricingSchema.parse(rawParams);

  return prismadb.transportPricing.findMany({
    where: {
      isActive: true,
      ...(locationId && { locationId }),
      ...(vehicleTypeId && { vehicleTypeId }),
      ...(transportType && { transportType }),
      ...(startDate && { endDate: { gte: new Date(startDate) } }),
      ...(endDate && { startDate: { lte: new Date(endDate) } }),
    },
    select: {
      id: true,
      price: true,
      transportType: true,
      description: true,
      startDate: true,
      endDate: true,
      location: { select: { id: true, label: true } },
      vehicleType: { select: { id: true, name: true } },
    },
    orderBy: [{ locationId: "asc" }, { startDate: "asc" }],
  });
}

async function createHotelPricing(rawParams: unknown) {
  const { hotelId, startDate, endDate, roomTypeId, occupancyTypeId, price, mealPlanId, locationSeasonalPeriodId } =
    CreateHotelPricingSchema.parse(rawParams);

  const hotel = await prismadb.hotel.findUnique({ where: { id: hotelId }, select: { id: true } });
  if (!hotel) throw new NotFoundError(`Hotel ${hotelId} not found`);

  const start = new Date(startDate);
  const end = new Date(endDate);

  const conflicts = await prismadb.$transaction((tx) =>
    findOverlappingBasePricings(tx, {
      hotelId,
      startDate: start,
      endDate: end,
      roomTypeId,
      occupancyTypeId,
      mealPlanId: mealPlanId ?? null,
    })
  );
  if (conflicts.length > 0) {
    throw new Error(
      "Overlapping hotel pricing exists. Use Special Date Pricing for event/holiday overrides, or adjust the normal pricing dates."
    );
  }

  const created = await prismadb.hotelPricing.create({
    data: {
      hotelId,
      startDate: start,
      endDate: end,
      roomTypeId,
      occupancyTypeId,
      price,
      mealPlanId: mealPlanId ?? null,
      locationSeasonalPeriodId: locationSeasonalPeriodId ?? null,
      isActive: true,
    },
  });

  return prismadb.hotelPricing.findUniqueOrThrow({
    where: { id: created.id },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      price: true,
      locationSeasonalPeriodId: true,
      roomType: { select: { id: true, name: true } },
      occupancyType: { select: { id: true, name: true } },
      mealPlan: { select: { id: true, name: true } },
      locationSeasonalPeriod: { select: { id: true, name: true, seasonType: true } },
    },
  });
}

async function updateHotelPricing(rawParams: unknown) {
  const { hotelId, pricingId, startDate, endDate, roomTypeId, occupancyTypeId, price, mealPlanId, locationSeasonalPeriodId } =
    UpdateHotelPricingSchema.parse(rawParams);

  const existing = await prismadb.hotelPricing.findUnique({
    where: { id: pricingId },
    select: {
      id: true,
      hotelId: true,
      startDate: true,
      endDate: true,
      roomTypeId: true,
      occupancyTypeId: true,
      mealPlanId: true,
      price: true,
      locationSeasonalPeriodId: true,
      isActive: true,
    },
  });
  if (!existing || existing.hotelId !== hotelId) {
    throw new NotFoundError(`Hotel pricing ${pricingId} not found`);
  }

  const merged = {
    hotelId,
    startDate: startDate !== undefined ? new Date(startDate) : existing.startDate,
    endDate: endDate !== undefined ? new Date(endDate) : existing.endDate,
    roomTypeId: roomTypeId ?? existing.roomTypeId!,
    occupancyTypeId: occupancyTypeId ?? existing.occupancyTypeId!,
    mealPlanId: mealPlanId !== undefined ? mealPlanId : existing.mealPlanId,
    price: price !== undefined ? price : existing.price,
    locationSeasonalPeriodId:
      locationSeasonalPeriodId !== undefined
        ? locationSeasonalPeriodId
        : existing.locationSeasonalPeriodId,
    isActive: existing.isActive,
  };

  const dimensionalOrDateChange =
    startDate !== undefined ||
    endDate !== undefined ||
    roomTypeId !== undefined ||
    occupancyTypeId !== undefined ||
    mealPlanId !== undefined;

  if (dimensionalOrDateChange) {
    const conflicts = await prismadb.$transaction((tx) =>
      findOverlappingBasePricings(tx, {
        hotelId: merged.hotelId,
        roomTypeId: merged.roomTypeId,
        occupancyTypeId: merged.occupancyTypeId,
        mealPlanId: merged.mealPlanId,
        startDate: merged.startDate,
        endDate: merged.endDate,
        excludeId: pricingId,
      })
    );
    if (conflicts.length > 0) {
      throw new Error(
        "Overlapping hotel pricing exists. Use Special Date Pricing for event/holiday overrides, or adjust the normal pricing dates."
      );
    }
  }

  return prismadb.hotelPricing.update({
    where: { id: pricingId },
    data: {
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: new Date(endDate) }),
      ...(roomTypeId !== undefined && { roomTypeId }),
      ...(occupancyTypeId !== undefined && { occupancyTypeId }),
      ...(price !== undefined && { price }),
      ...(mealPlanId !== undefined && { mealPlanId }),
      ...(locationSeasonalPeriodId !== undefined && { locationSeasonalPeriodId }),
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      price: true,
      locationSeasonalPeriodId: true,
      roomType: { select: { id: true, name: true } },
      occupancyType: { select: { id: true, name: true } },
      mealPlan: { select: { id: true, name: true } },
      locationSeasonalPeriod: { select: { id: true, name: true, seasonType: true } },
    },
  });
}

async function deleteHotelPricing(rawParams: unknown) {
  const { hotelId, pricingId } = DeleteHotelPricingSchema.parse(rawParams);

  const existing = await prismadb.hotelPricing.findUnique({ where: { id: pricingId }, select: { id: true, hotelId: true } });
  if (!existing || existing.hotelId !== hotelId) throw new NotFoundError(`Hotel pricing ${pricingId} not found`);

  await prismadb.hotelPricing.delete({ where: { id: pricingId } });
  return { success: true };
}

async function createTransportPricing(rawParams: unknown) {
  const { locationId, vehicleTypeId, price, transportType, startDate, endDate, description } =
    CreateTransportPricingSchema.parse(rawParams);

  return prismadb.transportPricing.create({
    data: {
      locationId,
      vehicleTypeId,
      price,
      transportType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      description: description ?? null,
      isActive: true,
    },
    select: {
      id: true,
      price: true,
      transportType: true,
      description: true,
      startDate: true,
      endDate: true,
      location: { select: { id: true, label: true } },
      vehicleType: { select: { id: true, name: true } },
    },
  });
}

async function updateTransportPricing(rawParams: unknown) {
  const { pricingId, locationId, vehicleTypeId, price, transportType, startDate, endDate, description, isActive } =
    UpdateTransportPricingSchema.parse(rawParams);

  const existing = await prismadb.transportPricing.findUnique({ where: { id: pricingId }, select: { id: true } });
  if (!existing) throw new NotFoundError(`Transport pricing ${pricingId} not found`);

  return prismadb.transportPricing.update({
    where: { id: pricingId },
    data: {
      ...(locationId !== undefined && { locationId }),
      ...(vehicleTypeId !== undefined && { vehicleTypeId }),
      ...(price !== undefined && { price }),
      ...(transportType !== undefined && { transportType }),
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: new Date(endDate) }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive }),
    },
    select: {
      id: true,
      price: true,
      transportType: true,
      description: true,
      startDate: true,
      endDate: true,
      isActive: true,
      location: { select: { id: true, label: true } },
      vehicleType: { select: { id: true, name: true } },
    },
  });
}

async function deleteTransportPricing(rawParams: unknown) {
  const { pricingId } = DeleteTransportPricingSchema.parse(rawParams);

  const existing = await prismadb.transportPricing.findUnique({ where: { id: pricingId }, select: { id: true } });
  if (!existing) throw new NotFoundError(`Transport pricing ${pricingId} not found`);

  await prismadb.transportPricing.delete({ where: { id: pricingId } });
  return { success: true };
}

// ── Export ────────────────────────────────────────────────────────────────────

export const locationHandlers: ToolHandlerMap = {
  search_locations: searchLocations,
  list_tour_packages: listTourPackages,
  get_tour_package: getTourPackage,
  list_hotels: listHotels,
  list_destinations: listDestinations,
  get_hotel_pricing: getHotelPricing,
  create_hotel_pricing: createHotelPricing,
  update_hotel_pricing: updateHotelPricing,
  delete_hotel_pricing: deleteHotelPricing,
  get_transport_pricing: getTransportPricing,
  create_transport_pricing: createTransportPricing,
  update_transport_pricing: updateTransportPricing,
  delete_transport_pricing: deleteTransportPricing,
};
