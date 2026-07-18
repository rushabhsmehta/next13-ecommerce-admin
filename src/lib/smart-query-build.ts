import type { Prisma } from "@prisma/client";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from "@/lib/timezone-utils";
import { carryForwardInquiryCouponToTourQuery } from "@/lib/coupons";

const roomAllocationSchema = z.object({
  roomTypeId: z.string().optional(),
  occupancyTypeId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  customRoomType: z.string().optional(),
  useCustomRoomType: z.boolean().optional().default(false),
});

const transportDetailSchema = z.object({
  vehicleTypeId: z.string().optional().nullable(),
  quantity: z.coerce.number().int().min(1).optional().default(1),
  isAirportPickupRequired: z.boolean().optional().default(false),
  isAirportDropRequired: z.boolean().optional().default(false),
  pickupLocation: z.string().optional().nullable(),
  dropLocation: z.string().optional().nullable(),
  requirementDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const smartBuildInputSchema = z.object({
  inquiryId: z.string().min(1),
  tourPackageId: z.string().min(1),
  mealPlanId: z.string().min(1),
  roomAllocations: z.array(roomAllocationSchema).min(1),
  transportDetails: z.array(transportDetailSchema).optional().default([]),
  totalPrice: z.coerce.number().optional().nullable(),
  tourPackageQueryNumber: z.string().optional(),
  pricingSection: z
    .array(
      z.object({
        name: z.string(),
        price: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
      })
    )
    .optional(),
});

export type SmartBuildInput = z.infer<typeof smartBuildInputSchema>;

export type SmartBuildPriceLine = {
  name: string;
  basePrice: number;
  occupancyMultiplier: number;
  roomQuantity: number;
  totalPrice: number;
  description: string;
};

export function getOccupancyMultiplier(componentName: string): number {
  const name = componentName.toLowerCase();
  if (name.includes("single")) return 1;
  if (name.includes("double")) return 2;
  if (name.includes("triple")) return 3;
  if (name.includes("quad")) return 4;
  return 1;
}

export function validateTourPackageTemplate(tourPackage: {
  tourPackageName?: string | null;
  locationId?: string | null;
  itineraries?: Array<{
    itineraryTitle?: string | null;
    dayTitle?: string | null;
    locationId?: string | null;
    dayNumber?: number | null;
    day?: number | null;
  }> | null;
}): string[] {
  const errors: string[] = [];
  if (!tourPackage) {
    errors.push("No tour package selected");
    return errors;
  }
  if (!tourPackage.itineraries?.length) {
    errors.push(
      `Selected tour package "${tourPackage.tourPackageName ?? "Unknown"}" has no itineraries defined`
    );
  } else {
    tourPackage.itineraries.forEach((itinerary, index) => {
      const dayRef = `Day ${index + 1}`;
      if (!itinerary.itineraryTitle && !itinerary.dayTitle) {
        errors.push(`${dayRef}: Missing itinerary title`);
      }
      if (!itinerary.locationId) {
        errors.push(`${dayRef}: Missing location information`);
      }
      if (!itinerary.dayNumber && !itinerary.day) {
        errors.push(`${dayRef}: Missing day number`);
      }
    });
  }
  if (!tourPackage.tourPackageName) errors.push("Tour package missing name");
  if (!tourPackage.locationId) errors.push("Tour package missing location");
  return errors;
}

function generateTourPackageQueryNumber(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `TPQ-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours()
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

async function resolveRoomTypeId(allocation: z.infer<typeof roomAllocationSchema>, idx: number) {
  if (allocation.roomTypeId) return allocation.roomTypeId;
  const useCustom = allocation.useCustomRoomType === true;
  const customLabel = (allocation.customRoomType || "").trim();
  if (useCustom && customLabel.length > 0) {
    let placeholder = await prismadb.roomType.findUnique({ where: { name: "Custom" } });
    if (!placeholder) {
      placeholder = await prismadb.roomType.create({
        data: {
          name: "Custom",
          description: "Custom ad-hoc room type placeholder",
          isActive: true,
        },
      });
    }
    return placeholder.id;
  }
  throw new Error(
    `Room allocation ${idx + 1}: roomTypeId is required unless a customRoomType is provided with useCustomRoomType=true`
  );
}

async function createQueryItineraryWithRelations(
  itinerary: {
    itineraryTitle: string;
    itineraryDescription?: string | null;
    locationId: string;
    tourPackageId?: string | null;
    dayNumber: number;
    days?: string | null;
    hotelId?: string | null;
    numberofRooms?: string | null;
    roomCategory?: string | null;
    mealsIncluded?: string | null;
    itineraryImages?: { url: string }[];
    activities?: Array<{
      activityTitle?: string | null;
      activityDescription?: string | null;
      locationId?: string | null;
      activityImages?: { url: string }[];
    }>;
    roomAllocations?: Array<{
      roomTypeId?: string;
      occupancyTypeId: string;
      mealPlanId: string;
      quantity: number;
      customRoomType?: string;
      useCustomRoomType?: boolean;
      guestNames?: string;
      voucherNumber?: string;
    }>;
    transportDetails?: Array<{
      vehicleTypeId?: string | null;
      quantity?: number;
      isAirportPickupRequired?: boolean;
      isAirportDropRequired?: boolean;
      pickupLocation?: string | null;
      dropLocation?: string | null;
      requirementDate?: string | null;
      notes?: string | null;
    }>;
  },
  tourPackageQueryId: string
) {
  const createdItinerary = await prismadb.itinerary.create({
    data: {
      itineraryTitle: itinerary.itineraryTitle,
      itineraryDescription: itinerary.itineraryDescription,
      locationId: itinerary.locationId,
      tourPackageId: itinerary.tourPackageId,
      tourPackageQueryId,
      dayNumber: itinerary.dayNumber,
      days: itinerary.days,
      hotelId: itinerary.hotelId,
      numberofRooms: itinerary.numberofRooms,
      roomCategory: itinerary.roomCategory,
      mealsIncluded: itinerary.mealsIncluded,
      itineraryImages: itinerary.itineraryImages?.length
        ? { createMany: { data: itinerary.itineraryImages.map((img) => ({ url: img.url })) } }
        : undefined,
    },
  });

  if (itinerary.activities?.length) {
    await Promise.all(
      itinerary.activities.map((activity) =>
        prismadb.activity.create({
          data: {
            itineraryId: createdItinerary.id,
            activityTitle: activity.activityTitle,
            activityDescription: activity.activityDescription,
            locationId: activity.locationId ?? itinerary.locationId,
            activityImages: activity.activityImages?.length
              ? {
                  createMany: {
                    data: activity.activityImages.map((img) => ({ url: img.url })),
                  },
                }
              : undefined,
          },
        })
      )
    );
  }

  if (itinerary.roomAllocations?.length) {
    await Promise.all(
      itinerary.roomAllocations.map(async (roomAllocation, idx) => {
        const roomTypeIdToUse = roomAllocation.roomTypeId
          ? roomAllocation.roomTypeId
          : await resolveRoomTypeId(
              {
                roomTypeId: roomAllocation.roomTypeId,
                occupancyTypeId: roomAllocation.occupancyTypeId,
                quantity: roomAllocation.quantity,
                customRoomType: roomAllocation.customRoomType,
                useCustomRoomType: roomAllocation.useCustomRoomType ?? false,
              },
              idx
            );
        return prismadb.roomAllocation.create({
          data: {
            itineraryId: createdItinerary.id,
            roomTypeId: roomTypeIdToUse,
            occupancyTypeId: roomAllocation.occupancyTypeId,
            mealPlanId: roomAllocation.mealPlanId,
            quantity: roomAllocation.quantity,
            guestNames: roomAllocation.guestNames ?? "",
            voucherNumber: roomAllocation.voucherNumber ?? "",
            customRoomType: roomAllocation.customRoomType,
          },
        });
      })
    );
  }

  if (itinerary.transportDetails?.length) {
    await Promise.all(
      itinerary.transportDetails
        .filter(
          (transport): transport is typeof transport & { vehicleTypeId: string } =>
            Boolean(transport.vehicleTypeId)
        )
        .map((transport) =>
        prismadb.transportDetail.create({
          data: {
            itineraryId: createdItinerary.id,
            vehicleTypeId: transport.vehicleTypeId,
            quantity: transport.quantity ?? 1,
            isAirportPickupRequired: !!transport.isAirportPickupRequired,
            isAirportDropRequired: !!transport.isAirportDropRequired,
            pickupLocation: transport.pickupLocation ?? undefined,
            dropLocation: transport.dropLocation ?? undefined,
            requirementDate: transport.requirementDate
              ? dateToUtc(transport.requirementDate)
              : undefined,
            notes: transport.notes ?? undefined,
          },
        })
      )
    );
  }

  return createdItinerary;
}

export async function loadSmartBuildPrefill(inquiryId: string) {
  const inquiry = await prismadb.inquiry.findUnique({
    where: { id: inquiryId },
    select: {
      id: true,
      customerName: true,
      customerMobileNumber: true,
      locationId: true,
      numAdults: true,
      numChildren5to11: true,
      numChildrenBelow5: true,
      journeyDate: true,
      remarks: true,
      associatePartnerId: true,
      location: { select: { id: true, label: true } },
      roomAllocations: {
        select: {
          roomTypeId: true,
          occupancyTypeId: true,
          mealPlanId: true,
          quantity: true,
          customRoomType: true,
        },
      },
      transportDetails: {
        select: {
          vehicleTypeId: true,
          quantity: true,
          isAirportPickupRequired: true,
          isAirportDropRequired: true,
          pickupLocation: true,
          dropLocation: true,
          requirementDate: true,
          notes: true,
        },
      },
    },
  });
  if (!inquiry) {
    throw new Error("Inquiry not found");
  }

  const [tourPackages, mealPlans, roomTypes, occupancyTypes, vehicleTypes] =
    await Promise.all([
      prismadb.tourPackage.findMany({
        where: { locationId: inquiry.locationId, isArchived: false },
        select: {
          id: true,
          tourPackageName: true,
          tourPackageType: true,
          tourCategory: true,
          numDaysNight: true,
          locationId: true,
          itineraries: {
            select: {
              id: true,
              itineraryTitle: true,
              dayNumber: true,
              locationId: true,
            },
            orderBy: [{ dayNumber: "asc" }],
          },
        },
        orderBy: { tourPackageName: "asc" },
      }),
      prismadb.mealPlan.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prismadb.roomType.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prismadb.occupancyType.findMany({
        where: { isActive: true },
        select: { id: true, name: true, maxPersons: true },
        orderBy: [{ rank: "asc" }, { name: "asc" }],
      }),
      prismadb.vehicleType.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

  const suggestedRoomAllocations =
    inquiry.roomAllocations.length > 0
      ? inquiry.roomAllocations.map((ra) => ({
          roomTypeId: ra.roomTypeId ?? undefined,
          occupancyTypeId: ra.occupancyTypeId,
          quantity: ra.quantity,
          customRoomType: ra.customRoomType ?? "",
          useCustomRoomType: !ra.roomTypeId && !!ra.customRoomType,
        }))
      : [{ roomTypeId: "", occupancyTypeId: "", quantity: 1, customRoomType: "", useCustomRoomType: false }];

  const suggestedTransport = inquiry.transportDetails.map((t) => ({
    vehicleTypeId: t.vehicleTypeId,
    quantity: t.quantity ?? 1,
    isAirportPickupRequired: !!t.isAirportPickupRequired,
    isAirportDropRequired: !!t.isAirportDropRequired,
    pickupLocation: t.pickupLocation ?? "",
    dropLocation: t.dropLocation ?? "",
    requirementDate: t.requirementDate?.toISOString().slice(0, 10) ?? null,
    notes: t.notes ?? "",
  }));

  return {
    inquiry: {
      id: inquiry.id,
      customerName: inquiry.customerName,
      customerMobileNumber: inquiry.customerMobileNumber,
      locationId: inquiry.locationId,
      locationLabel: inquiry.location.label,
      numAdults: inquiry.numAdults,
      numChildren5to11: inquiry.numChildren5to11,
      numChildrenBelow5: inquiry.numChildrenBelow5,
      journeyDate: inquiry.journeyDate?.toISOString().slice(0, 10) ?? null,
      remarks: inquiry.remarks,
      associatePartnerId: inquiry.associatePartnerId,
    },
    tourPackages: tourPackages.map((pkg) => ({
      id: pkg.id,
      tourPackageName: pkg.tourPackageName,
      tourPackageType: pkg.tourPackageType,
      tourCategory: pkg.tourCategory,
      numDaysNight: pkg.numDaysNight,
      itineraryCount: pkg.itineraries.length,
      validationErrors: validateTourPackageTemplate(pkg),
    })),
    lookups: {
      mealPlans,
      roomTypes,
      occupancyTypes,
      vehicleTypes,
    },
    suggestedRoomAllocations,
    suggestedTransport,
  };
}

export async function calculateSmartBuildPrice(input: {
  tourPackageId: string;
  mealPlanId: string;
  roomAllocations: SmartBuildInput["roomAllocations"];
  journeyDate: Date | string | null;
}) {
  if (!input.journeyDate) {
    return { totalPrice: null, lines: [] as SmartBuildPriceLine[], error: "Journey date is required for pricing" };
  }

  const totalRooms = input.roomAllocations.reduce(
    (sum, allocation) => sum + (allocation.quantity || 1),
    0
  );
  const queryDate = new Date(input.journeyDate);
  if (!Number.isFinite(queryDate.getTime())) {
    return { totalPrice: null, lines: [] as SmartBuildPriceLine[], error: "Invalid journey date" };
  }

  const tourPackagePricings = await prismadb.tourPackagePricing.findMany({
    where: {
      tourPackageId: input.tourPackageId,
      isActive: true,
      packageVariantId: null,
    },
    include: {
      pricingComponents: {
        include: { pricingAttribute: true },
        orderBy: { pricingAttribute: { sortOrder: "asc" } },
      },
    },
    orderBy: { startDate: "asc" },
  });

  if (!tourPackagePricings.length) {
    return {
      totalPrice: null,
      lines: [] as SmartBuildPriceLine[],
      error: "No pricing periods found for the selected tour package",
    };
  }

  const matchedPricings = tourPackagePricings.filter((p) => {
    const periodStart = new Date(p.startDate);
    const periodEnd = new Date(p.endDate);
    return (
      queryDate >= periodStart &&
      queryDate <= periodEnd &&
      p.mealPlanId === input.mealPlanId &&
      p.numberOfRooms === totalRooms
    );
  });

  if (matchedPricings.length === 0) {
    return {
      totalPrice: null,
      lines: [] as SmartBuildPriceLine[],
      error: `No matching pricing for ${queryDate.toISOString().slice(0, 10)}, ${totalRooms} room(s), selected meal plan`,
    };
  }
  if (matchedPricings.length > 1) {
    return {
      totalPrice: null,
      lines: [] as SmartBuildPriceLine[],
      error: "Multiple pricing periods match the criteria. Refine tour package pricing definitions.",
    };
  }

  const selectedPricing = matchedPricings[0];
  let totalPrice = 0;
  const lines: SmartBuildPriceLine[] = [];
  const roomQty = selectedPricing.numberOfRooms || 1;

  for (const comp of selectedPricing.pricingComponents) {
    const componentName = comp.pricingAttribute?.name || "Pricing Component";
    const basePrice = parseFloat(String(comp.price ?? "0"));
    const occupancyMultiplier = getOccupancyMultiplier(componentName);
    const componentTotal = basePrice * occupancyMultiplier * roomQty;
    totalPrice += componentTotal;
    lines.push({
      name: componentName,
      basePrice,
      occupancyMultiplier,
      roomQuantity: roomQty,
      totalPrice: componentTotal,
      description: `${basePrice.toFixed(2)} × ${occupancyMultiplier} occupancy × ${roomQty} room${roomQty > 1 ? "s" : ""} = ₹${componentTotal.toFixed(2)}`,
    });
  }

  return {
    totalPrice,
    lines,
    pricingSection: lines.map((line) => ({
      name: line.name,
      price: line.totalPrice.toFixed(2),
      description: line.description,
    })),
    error: null as string | null,
  };
}

export async function createSmartBuildTourQuery(
  input: SmartBuildInput,
  options?: { associatePartnerId?: string | null }
) {
  const inquiry = await prismadb.inquiry.findUnique({
    where: { id: input.inquiryId },
    include: {
      transportDetails: true,
    },
  });
  if (!inquiry) throw new Error("Inquiry not found");

  const tourPackage = await prismadb.tourPackage.findUnique({
    where: { id: input.tourPackageId },
    include: {
      itineraries: {
        include: {
          itineraryImages: true,
          activities: { include: { activityImages: true } },
        },
        orderBy: [{ dayNumber: "asc" }],
      },
    },
  });
  if (!tourPackage) throw new Error("Tour package not found");

  const templateErrors = validateTourPackageTemplate(tourPackage);
  if (templateErrors.length) {
    throw new Error(`Template validation failed: ${templateErrors.join(", ")}`);
  }

  const transportSource =
    input.transportDetails.length > 0
      ? input.transportDetails
      : inquiry.transportDetails.map((t) => ({
          vehicleTypeId: t.vehicleTypeId,
          quantity: t.quantity ?? 1,
          isAirportPickupRequired: !!t.isAirportPickupRequired,
          isAirportDropRequired: !!t.isAirportDropRequired,
          pickupLocation: t.pickupLocation ?? "",
          dropLocation: t.dropLocation ?? "",
          requirementDate: t.requirementDate?.toISOString().slice(0, 10) ?? null,
          notes: t.notes ?? "",
        }));

  const itineraries = (tourPackage.itineraries ?? []).map((itinerary, index) => ({
    itineraryTitle: itinerary.itineraryTitle || `Day ${index + 1}`,
    itineraryDescription: itinerary.itineraryDescription,
    locationId: itinerary.locationId,
    tourPackageId: tourPackage.id,
    dayNumber: itinerary.dayNumber ?? index + 1,
    days: itinerary.days,
    hotelId: itinerary.hotelId,
    numberofRooms: itinerary.numberofRooms,
    roomCategory: itinerary.roomCategory,
    mealsIncluded: itinerary.mealsIncluded,
    itineraryImages: (itinerary.itineraryImages ?? []).map((img) => ({ url: img.url })),
    activities: (itinerary.activities ?? []).map((activity) => ({
      activityTitle: activity.activityTitle,
      activityDescription: activity.activityDescription,
      locationId: itinerary.locationId,
      activityImages: (activity.activityImages ?? []).map((img) => ({ url: img.url })),
    })),
    roomAllocations: input.roomAllocations.map((allocation) => ({
      roomTypeId: allocation.useCustomRoomType ? undefined : allocation.roomTypeId,
      occupancyTypeId: allocation.occupancyTypeId,
      mealPlanId: input.mealPlanId,
      quantity: allocation.quantity,
      customRoomType: allocation.customRoomType,
      useCustomRoomType: allocation.useCustomRoomType,
      guestNames: "",
      voucherNumber: "",
    })),
    transportDetails: transportSource.map((transport) => ({
      vehicleTypeId: transport.vehicleTypeId,
      quantity: transport.quantity ?? 1,
      isAirportPickupRequired: !!transport.isAirportPickupRequired,
      isAirportDropRequired: !!transport.isAirportDropRequired,
      pickupLocation: transport.pickupLocation || "",
      dropLocation: transport.dropLocation || "",
      requirementDate: transport.requirementDate,
      notes: transport.notes || "",
    })),
  }));

  const associatePartnerId =
    options?.associatePartnerId !== undefined
      ? options.associatePartnerId
      : inquiry.associatePartnerId;

  const created = await prismadb.tourPackageQuery.create({
    data: {
      inquiryId: inquiry.id,
      associatePartnerId,
      tourPackageQueryNumber:
        input.tourPackageQueryNumber?.trim() || generateTourPackageQueryNumber(),
      tourPackageQueryName: [inquiry.customerName, tourPackage.tourPackageName]
        .map((part) => String(part ?? "").trim())
        .filter(Boolean)
        .join(" - "),
      tourPackageQueryType: tourPackage.tourPackageType,
      tourCategory: tourPackage.tourCategory || "Domestic",
      customerName: inquiry.customerName,
      customerNumber: inquiry.customerMobileNumber,
      locationId: inquiry.locationId,
      selectedTemplateId: tourPackage.id,
      selectedTemplateType: "TourPackage",
      selectedMealPlanId: input.mealPlanId,
      numAdults: String(inquiry.numAdults ?? ""),
      numChild5to12: String(inquiry.numChildren5to11 ?? ""),
      numChild0to5: String(inquiry.numChildrenBelow5 ?? ""),
      numDaysNight: tourPackage.numDaysNight || "1",
      tourStartsFrom: inquiry.journeyDate ? dateToUtc(inquiry.journeyDate) : null,
      totalPrice:
        input.totalPrice != null ? String(input.totalPrice) : undefined,
      pricingSection: input.pricingSection?.length ? input.pricingSection : undefined,
      isFeatured: false,
      isArchived: false,
    },
    select: {
      id: true,
      inquiryId: true,
      tourPackageQueryNumber: true,
      tourPackageQueryName: true,
    },
  });

  try {
    await Promise.all(
      itineraries.map((itinerary, index) =>
        createQueryItineraryWithRelations(itinerary, created.id).catch((err) => {
          throw new Error(
            `Itinerary ${index + 1} failed: ${err instanceof Error ? err.message : String(err)}`
          );
        })
      )
    );
  } catch (error) {
    await prismadb.tourPackageQuery.delete({ where: { id: created.id } });
    throw error;
  }

  try {
    await carryForwardInquiryCouponToTourQuery({
      inquiryId: inquiry.id,
      tourPackageQueryId: created.id,
    });
  } catch {
    /* coupon carry-forward is best-effort */
  }

  return created;
}
