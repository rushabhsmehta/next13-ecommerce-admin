import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { dateToUtc } from '@/lib/timezone-utils';

import prismadb from "@/lib/prismadb";
import { string } from "zod";
import { Activity } from "@prisma/client";
import { createAuditLog } from "@/lib/utils/audit-logger";
import { createVariantSnapshots, applyVariantHotelOverrides, applyVariantPricingOverrides, deleteVariantSnapshots } from '@/lib/variant-snapshot';

export const dynamic = 'force-dynamic'; // Ensure API is not cached


export async function GET(req: Request, props: { params: Promise<{ tourPackageQueryId: string }> }) {
  const params = await props.params;
  try {
    // Defense in depth: edge middleware protects this path, but the handler
    // must not rely on it — this payload contains customer PII and pricing.
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    console.log('[TOUR_PACKAGE_QUERY_GET] Starting GET request for ID:', params.tourPackageQueryId);

    if (!params.tourPackageQueryId) {
      return new NextResponse("Tour Package Query id is required", { status: 400 });
    }

    const tourPackageQuery = await prismadb.tourPackageQuery.findUnique({
      where: {
        id: params.tourPackageQueryId
      },
      include: {
        associatePartner: true,
        flightDetails: {
          include: {
            images: true,
          }
        },
        images: true,
        location: true,
        //hotel: true,
        itineraries: {
          include: {
            itineraryImages: true,
            roomAllocations: {
              include: {
                roomType: true,
                occupancyType: true,
                mealPlan: true,
                extraBeds: {
                  include: {
                    occupancyType: true,
                  },
                },
              },
            },
            transportDetails: true,
            activities: {
              include: {
                activityImages: true,
              }
            }
          },
          orderBy: [
            { dayNumber: 'asc' },
            { days: 'asc' }
          ]
        },
        queryVariantSnapshots: {
          include: {
            hotelSnapshots: {
              orderBy: { dayNumber: 'asc' },
            },
            pricingSnapshots: {
              include: {
                pricingComponentSnapshots: {
                  orderBy: { createdAt: 'asc' },
                },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      }
    });

    console.log('[TOUR_PACKAGE_QUERY_GET] Query executed successfully');

    if (!tourPackageQuery) {
      console.log('[TOUR_PACKAGE_QUERY_GET] Tour package query not found');
      return new NextResponse("Tour package query not found", { status: 404 });
    }

    return NextResponse.json(tourPackageQuery);
  } catch (error: any) {
    console.error('[TOUR_PACKAGE_QUERY_GET] Error occurred:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    return new NextResponse("Internal error", { status: 500 });
  }
};

export async function DELETE(req: Request, props: { params: Promise<{ tourPackageQueryId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.tourPackageQueryId) {
      return new NextResponse("Tour Package Query Id is required", { status: 400 });
    }

    // Fetch the record before deletion for audit logging
    const original = await prismadb.tourPackageQuery.findUnique({
      where: { id: params.tourPackageQueryId },
      include: {
        associatePartner: true,
        location: true,
      }
    });

    const tourPackageQuery = await prismadb.tourPackageQuery.delete({
      where: {
        id: params.tourPackageQueryId
      },
    });

    // Log audit entry for deletion (best-effort)
    try {
      await createAuditLog({
        entityId: params.tourPackageQueryId,
        entityType: "TourPackageQuery",
        action: "DELETE",
        before: original,
        userRole: "ADMIN",
        metadata: {
          tourPackageQueryNumber: original?.tourPackageQueryNumber,
          tourPackageQueryName: original?.tourPackageQueryName,
        }
      });
    } catch (e) {
      console.error('[TOURPACKAGE_QUERY_AUDIT_DELETE]', e);
    }

    return NextResponse.json(tourPackageQuery);
  } catch (error) {
    console.log('[TOURPACKAGE_QUERY_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};

async function createItineraryAndActivities(itinerary: {
  itineraryTitle: any;
  itineraryDescription: any;
  locationId: any;
  tourPackageId: any;
  dayNumber: any;
  days: any;
  hotelId: any;
  numberofRooms: any;
  roomCategory: any;
  mealsIncluded: any;
  itineraryImages: any[];
  activities: any[];
  roomAllocations?: any[];
  transportDetails?: any[];
}, tourPackageQueryId: string) {
  console.log("PATCH: Received itinerary with roomAllocations:", itinerary.roomAllocations);
  console.log("PATCH: Received itinerary with transportDetails:", itinerary.transportDetails);

  // First, create the itinerary and get its id
  const createdItinerary = await prismadb.itinerary.create({
    data: {
      itineraryTitle: itinerary.itineraryTitle,
      itineraryDescription: itinerary.itineraryDescription,
      locationId: itinerary.locationId,
      tourPackageId: itinerary.tourPackageId,
      tourPackageQueryId: tourPackageQueryId,
      dayNumber: itinerary.dayNumber,
      days: itinerary.days,
      hotelId: itinerary.hotelId,
      numberofRooms: itinerary.numberofRooms,
      roomCategory: itinerary.roomCategory,
      mealsIncluded: itinerary.mealsIncluded,
      itineraryImages: {
        createMany: {
          data: itinerary.itineraryImages.map((image: { url: any; }) => ({ url: image.url })),
        },
      },
    },
  });

  // Next, create activities linked to this itinerary
  if (itinerary.activities && itinerary.activities.length > 0) {
    await Promise.all(itinerary.activities.map((activity: { activityTitle: any; activityDescription: any; locationId: any; activityImages: any[]; }) => {
      // console.log("Received Activities is ", activity);
      return prismadb.activity.create({
        data: {
          itineraryId: createdItinerary.id, // Link to the created itinerary
          activityTitle: activity.activityTitle,
          activityDescription: activity.activityDescription,
          locationId: activity.locationId,
          activityImages: {
            createMany: {
              data: activity.activityImages.map((img: { url: any; }) => ({ url: img.url })),
            },
          },
        },
      });
    }));
  }  // Create room allocations for this itinerary
  if (itinerary.roomAllocations && itinerary.roomAllocations.length > 0) {
    await Promise.all(itinerary.roomAllocations.map(async (roomAllocation: any) => {
      console.log("Creating room allocation with data:", roomAllocation);

      // Skip invalid room allocations - require occupancyTypeId and either roomTypeId OR customRoomType
      if (!roomAllocation.occupancyTypeId || (!roomAllocation.roomTypeId && !roomAllocation.customRoomType)) {
        console.log("WARNING: Missing required IDs for room allocation, skipping");
        return Promise.resolve();
      }

      const createdRoomAllocation = await prismadb.roomAllocation.create({
        data: {
          itineraryId: createdItinerary.id,
          roomTypeId: roomAllocation.roomTypeId || "4ae23712-19f7-4035-9db9-4d0df85d64ea", // Use Custom room type if no roomTypeId
          occupancyTypeId: roomAllocation.occupancyTypeId,
          mealPlanId: roomAllocation.mealPlanId,
          quantity: roomAllocation.quantity || 1,
          guestNames: roomAllocation.guestNames || "",
          voucherNumber: roomAllocation.voucherNumber || "",
          customRoomType: roomAllocation.customRoomType || ""
        }
      });

      // Create extra bed records
      if (roomAllocation.extraBeds && Array.isArray(roomAllocation.extraBeds) && roomAllocation.extraBeds.length > 0) {
        const validExtraBeds = roomAllocation.extraBeds.filter((eb: any) => eb?.occupancyTypeId);
        if (validExtraBeds.length > 0) {
          await prismadb.extraBed.createMany({
            data: validExtraBeds.map((eb: any) => ({
              roomAllocationId: createdRoomAllocation.id,
              occupancyTypeId: eb.occupancyTypeId,
              quantity: typeof eb.quantity === 'number' && eb.quantity > 0 ? eb.quantity : 1,
            }))
          });
        }
      }

      return createdRoomAllocation;
    }));
  }  // Create transport details for this itinerary
  if (itinerary.transportDetails && itinerary.transportDetails.length > 0) {
    await Promise.all(itinerary.transportDetails.map((transport: any) => {
      console.log("Creating transport detail with data:", transport);

      // Skip invalid transport details
      if (!transport.vehicleTypeId) {
        console.log("WARNING: Missing vehicleTypeId for transport detail, skipping");
        return Promise.resolve();
      }

      return prismadb.transportDetail.create({
        data: {
          itineraryId: createdItinerary.id,
          vehicleTypeId: transport.vehicleTypeId,
          quantity: transport.quantity || 1,
          description: transport.description || ""
        }
      });
    }));
  }

  return createdItinerary;
}

// Transaction-safe version of createItineraryAndActivities - optimized with batch operations
async function createItineraryAndActivitiesInTransaction(itinerary: {
  itineraryTitle: any;
  itineraryDescription: any;
  locationId: any;
  tourPackageId: any;
  dayNumber: any;
  days: any;
  hotelId: any;
  numberofRooms: any;
  roomCategory: any;
  mealsIncluded: any;
  itineraryImages: any[];
  activities: any[];
  roomAllocations?: any[];
  transportDetails?: any[];
}, tourPackageQueryId: string, tx: any) {
  try {
    // Step 1: Create the itinerary first
    const createdItinerary = await tx.itinerary.create({
      data: {
        itineraryTitle: itinerary.itineraryTitle,
        itineraryDescription: itinerary.itineraryDescription,
        locationId: itinerary.locationId,
        tourPackageId: itinerary.tourPackageId,
        tourPackageQueryId: tourPackageQueryId,
        dayNumber: itinerary.dayNumber,
        days: itinerary.days,
        hotelId: itinerary.hotelId,
        numberofRooms: itinerary.numberofRooms,
        roomCategory: itinerary.roomCategory,
        mealsIncluded: itinerary.mealsIncluded,
      },
    });

    // Step 2: Batch create itinerary images (if any)
    if (itinerary.itineraryImages && itinerary.itineraryImages.length > 0) {
      await tx.images.createMany({
        data: itinerary.itineraryImages.map((image: any) => ({
          itinerariesId: createdItinerary.id,
          url: image.url
        }))
      });
    }

    // Step 3: Create activities with their images in batch
    if (itinerary.activities && itinerary.activities.length > 0) {
      // We need activity IDs for images, so use Promise.all for parallel creation
      const activityCreationPromises = itinerary.activities.map(async (activity: any) => {
        const createdActivity = await tx.activity.create({
          data: {
            itineraryId: createdItinerary.id,
            activityTitle: activity.activityTitle,
            activityDescription: activity.activityDescription,
            locationId: activity.locationId,
          }
        });

        // Batch create activity images if they exist
        if (activity.activityImages && activity.activityImages.length > 0) {
          await tx.images.createMany({
            data: activity.activityImages.map((img: any) => ({
              activitiesId: createdActivity.id,
              url: img.url
            }))
          });
        }

        return createdActivity;
      });

      await Promise.all(activityCreationPromises);
    }

    // Step 4: Create room allocations with extra beds (if any)
    if (itinerary.roomAllocations && itinerary.roomAllocations.length > 0) {
      const validRoomAllocations = itinerary.roomAllocations.filter((ra: any) =>
        ra.occupancyTypeId
      );

      if (validRoomAllocations.length > 0) {
        await Promise.all(validRoomAllocations.map(async (roomAllocation: any) => {
          const createdRA = await tx.roomAllocation.create({
            data: {
              itineraryId: createdItinerary.id,
              roomTypeId: roomAllocation.roomTypeId || "4ae23712-19f7-4035-9db9-4d0df85d64ea",
              occupancyTypeId: roomAllocation.occupancyTypeId,
              mealPlanId: roomAllocation.mealPlanId,
              quantity: roomAllocation.quantity || 1,
              guestNames: roomAllocation.guestNames || "",
              voucherNumber: roomAllocation.voucherNumber || "",
              customRoomType: roomAllocation.customRoomType || ""
            }
          });
          if (roomAllocation.extraBeds && Array.isArray(roomAllocation.extraBeds) && roomAllocation.extraBeds.length > 0) {
            const validExtraBeds = roomAllocation.extraBeds.filter((eb: any) => eb?.occupancyTypeId);
            if (validExtraBeds.length > 0) {
              await tx.extraBed.createMany({
                data: validExtraBeds.map((eb: any) => ({
                  roomAllocationId: createdRA.id,
                  occupancyTypeId: eb.occupancyTypeId,
                  quantity: typeof eb.quantity === 'number' && eb.quantity > 0 ? eb.quantity : 1,
                }))
              });
            }
          }
          return createdRA;
        }));
      }
    }

    // Step 5: Batch create transport details (if any)
    if (itinerary.transportDetails && itinerary.transportDetails.length > 0) {
      const validTransportDetails = itinerary.transportDetails.filter((td: any) =>
        td.vehicleTypeId
      );

      if (validTransportDetails.length > 0) {
        await tx.transportDetail.createMany({
          data: validTransportDetails.map((transport: any) => ({
            itineraryId: createdItinerary.id,
            vehicleTypeId: transport.vehicleTypeId,
            quantity: transport.quantity || 1,
            description: transport.description || ""
          }))
        });
      }
    }

    return createdItinerary;
  } catch (error) {
    console.error("TRANSACTION: Failed to create itinerary:", itinerary.itineraryTitle, error);
    throw error;
  }
}

// Helper function to create flight details with images - optimized with batch operations
async function createFlightDetailWithImages(flightDetail: {
  date: string;
  flightName: string;
  flightNumber: string;
  from: string;
  to: string;
  departureTime: string;
  arrivalTime: string;
  flightDuration: string;
  images?: { url: string }[];
}, tourPackageQueryId: string, tx: any) {
  try {
    // Create the flight detail
    const createdFlightDetail = await tx.flightDetails.create({
      data: {
        date: flightDetail.date,
        flightName: flightDetail.flightName,
        flightNumber: flightDetail.flightNumber,
        from: flightDetail.from,
        to: flightDetail.to,
        departureTime: flightDetail.departureTime,
        arrivalTime: flightDetail.arrivalTime,
        flightDuration: flightDetail.flightDuration,
        tourPackageQueryId: tourPackageQueryId,
      },
    });

    // Batch create flight images if they exist
    if (flightDetail.images && flightDetail.images.length > 0) {
      await tx.images.createMany({
        data: flightDetail.images.map((image: any) => ({
          flightDetailsId: createdFlightDetail.id,
          url: image.url
        }))
      });
    }

    return createdFlightDetail;
  } catch (error) {
    console.error("Failed to create flight detail with images:", error);
    throw error;
  }
}

// Helper function to create flight details with images (fallback non-transactional)
async function createFlightDetailWithImagesFallback(flightDetail: {
  date: string;
  flightName: string;
  flightNumber: string;
  from: string;
  to: string;
  departureTime: string;
  arrivalTime: string;
  flightDuration: string;
  images?: { url: string }[];
}, tourPackageQueryId: string) {
  try {
    // Create the flight detail
    const createdFlightDetail = await prismadb.flightDetails.create({
      data: {
        date: flightDetail.date,
        flightName: flightDetail.flightName,
        flightNumber: flightDetail.flightNumber,
        from: flightDetail.from,
        to: flightDetail.to,
        departureTime: flightDetail.departureTime,
        arrivalTime: flightDetail.arrivalTime,
        flightDuration: flightDetail.flightDuration,
        tourPackageQueryId: tourPackageQueryId,
      },
    });

    // Create flight images if they exist
    if (flightDetail.images && flightDetail.images.length > 0) {
      for (const image of flightDetail.images) {
        await prismadb.images.create({
          data: {
            flightDetailsId: createdFlightDetail.id,
            url: image.url
          }
        });
      }
    }

    return createdFlightDetail;
  } catch (error) {
    console.error("Failed to create flight detail with images (fallback):", error);
    throw error;
  }
}

import { remapVariantDataKeys } from "@/lib/variant-data-remap";

export async function PATCH(req: Request, props: { params: Promise<{ tourPackageQueryId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();

    const body = await req.json();

    const {
      inquiryId,
      tourPackageQueryNumber,
      tourPackageQueryName,
      tourPackageQueryType,
      tourCategory,
      customerName,
      customerNumber,
      numDaysNight,
      locationId,
      period,
      tourStartsFrom,
      tourEndsOn,
      transport,
      pickup_location,
      drop_location,
      numAdults,
      numChild5to12,
      numChild0to5,
      price, pricePerAdult,
      pricePerChild5to12,
      pricePerChild0to5,
      totalPrice,
      pricingSection,
      pricingCalculationMethod,
      remarks,
      images,
      flightDetails,
      inclusions,
      exclusions,
      importantNotes,
      paymentPolicy,
      usefulTip,
      cancellationPolicy,
      airlineCancellationPolicy,
      termsconditions,
      kitchenGroupPolicy,
      disclaimer,
      isFeatured,
      isArchived,
      assignedTo,
      assignedToMobileNumber,
      assignedToEmail,
      associatePartnerId,
      selectedTemplateId,
      selectedTemplateType,
      tourPackageTemplateName,
      selectedMealPlanId,
      occupancySelections,
      selectedVariantIds, // Array of variant IDs to snapshot
      variantHotelOverrides, // Hotel overrides per variant
      variantRoomAllocations, // Room allocations per variant
      variantTransportDetails, // Transport details per variant
      variantPricingData, // Pricing data per variant
      confirmedVariantId, // ID of the confirmed/booked variant for voucher generation
      customQueryVariants, // Standalone variants created directly on this query
      itineraries,
    } = body;

    // Body-presence check — distinguishes "field not sent by caller" from
    // "field sent as undefined/null/empty". This is the contract we enforce
    // for variant-related JSON columns so untouched tabs cannot clobber
    // saved overrides with stale empty values.
    const hasBodyKey = (key: string) => Object.prototype.hasOwnProperty.call(body, key);

    console.log("===== INCOMING PATCH REQUEST ITINERARIES =====");
    if (itineraries) {
      try {
        const fs = require('fs');
        fs.writeFileSync('debug-itineraries.json', JSON.stringify(itineraries.map((it: any) => ({
          id: it.id,
          dayNumber: it.dayNumber,
          title: it.itineraryTitle
        })), null, 2));
      } catch (e) { }
    }
    console.log("==============================================");

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    if (!params.tourPackageQueryId) {
      return new NextResponse("Tour package query id is required", { status: 400 });
    }

    // Validate selectedVariantIds
    if (selectedVariantIds !== undefined && selectedVariantIds !== null) {
      if (!Array.isArray(selectedVariantIds)) {
        return NextResponse.json(
          { error: "selectedVariantIds must be an array" },
          { status: 400 }
        );
      }
      if (!selectedVariantIds.every((id: any) => typeof id === "string")) {
        return NextResponse.json(
          { error: "All variant IDs must be strings" },
          { status: 400 }
        );
      }
    }

    // Validate variantHotelOverrides
    if (variantHotelOverrides !== undefined && variantHotelOverrides !== null) {
      if (typeof variantHotelOverrides !== "object" || Array.isArray(variantHotelOverrides)) {
        return NextResponse.json(
          { error: "variantHotelOverrides must be an object" },
          { status: 400 }
        );
      }
      // Validate structure: { variantId: { itineraryId: hotelId } }
      for (const [variantId, overrides] of Object.entries(variantHotelOverrides)) {
        if (typeof overrides !== "object" || Array.isArray(overrides)) {
          return NextResponse.json(
            { error: `Invalid override structure for variant ${variantId}` },
            { status: 400 }
          );
        }
      }
    }

    // Validate itineraries before processing to prevent transaction issues
    if (itineraries && Array.isArray(itineraries) && itineraries.length > 0) {
      // Check for basic validation to prevent transaction failures
      const invalidItineraries = itineraries.filter((itinerary: any, index: number) => {
        if (!itinerary.itineraryTitle || !itinerary.locationId) {
          console.error(`[VALIDATION] Invalid itinerary at index ${index}:`, {
            title: itinerary.itineraryTitle,
            locationId: itinerary.locationId
          });
          return true;
        }
        return false;
      });

      if (invalidItineraries.length > 0) {
        return new NextResponse(`Invalid itinerary data found. Please check all itineraries have titles and locations.`, { status: 400 });
      }

      // Log for performance monitoring
      if (itineraries.length > 10) {
        console.warn(`[PERFORMANCE WARNING] Processing ${itineraries.length} itineraries. This may take longer than usual.`);
      }
    }

    const processedInclusions = Array.isArray(inclusions) ? inclusions : inclusions ? [inclusions] : [];
    const processedExclusions = Array.isArray(exclusions) ? exclusions : exclusions ? [exclusions] : [];
    const processedImportantNotes = Array.isArray(importantNotes) ? importantNotes : importantNotes ? [importantNotes] : [];
    const processedPaymentPolicy = Array.isArray(paymentPolicy) ? paymentPolicy : paymentPolicy ? [paymentPolicy] : [];
    const processedUsefulTip = Array.isArray(usefulTip) ? usefulTip : usefulTip ? [usefulTip] : [];
    const processedCancellationPolicy = Array.isArray(cancellationPolicy) ? cancellationPolicy : cancellationPolicy ? [cancellationPolicy] : [];
    const processedAirlineCancellationPolicy = Array.isArray(airlineCancellationPolicy) ? airlineCancellationPolicy : airlineCancellationPolicy ? [airlineCancellationPolicy] : [];
    const processedTermsConditions = Array.isArray(termsconditions) ? termsconditions : termsconditions ? [termsconditions] : [];
    const processedKitchenGroupPolicy = Array.isArray(kitchenGroupPolicy) ? kitchenGroupPolicy : kitchenGroupPolicy ? [kitchenGroupPolicy] : [];

    const tourPackageUpdateData = {
      inquiryId,
      tourPackageQueryNumber,
      tourPackageQueryName,
      tourPackageQueryType,
      tourCategory,
      customerName,
      customerNumber,
      numDaysNight,
      locationId,
      period,
      tourStartsFrom: dateToUtc(tourStartsFrom),
      tourEndsOn: dateToUtc(tourEndsOn),
      transport,
      pickup_location,
      drop_location,
      numAdults,
      numChild5to12,
      numChild0to5,
      price, pricePerAdult,
      pricePerChild5to12,
      pricePerChild0to5,
      totalPrice,
      pricingSection,
      pricingCalculationMethod: pricingCalculationMethod || null,
      remarks,
      inclusions: processedInclusions,
      exclusions: processedExclusions,
      importantNotes: processedImportantNotes,
      paymentPolicy: processedPaymentPolicy,
      usefulTip: processedUsefulTip,
      cancellationPolicy: processedCancellationPolicy,
      airlineCancellationPolicy: processedAirlineCancellationPolicy,
      termsconditions: processedTermsConditions,
      kitchenGroupPolicy: processedKitchenGroupPolicy,
      disclaimer,
      isFeatured: confirmedVariantId ? true : isFeatured,
      isArchived,
      assignedTo,
      assignedToMobileNumber,
      assignedToEmail,
      associatePartnerId,
      selectedTemplateId,
      selectedTemplateType,
      tourPackageTemplateName,
      selectedMealPlanId,
      // Variant JSON columns: preserve unless the caller explicitly sent the field.
      // Contract: key absent from body → preserve; key present with any value
      // (including null / {} / []) → write that value. This stops stale
      // form defaults from wiping saved overrides.
      ...(hasBodyKey('occupancySelections') ? { occupancySelections } : {}),
      ...(hasBodyKey('selectedVariantIds') ? { selectedVariantIds } : {}),
      ...(hasBodyKey('variantHotelOverrides') ? { variantHotelOverrides } : {}),
      ...(hasBodyKey('variantRoomAllocations') ? { variantRoomAllocations } : {}),
      ...(hasBodyKey('variantTransportDetails') ? { variantTransportDetails } : {}),
      ...(hasBodyKey('variantPricingData') ? { variantPricingData } : {}),
      ...(hasBodyKey('customQueryVariants') ? { customQueryVariants } : {}),
      confirmedVariantId: confirmedVariantId !== undefined ? (confirmedVariantId || null) : undefined, // Store confirmed variant ID

      // Only touch images when the caller explicitly sends the field.
      // undefined  → skip nested write, existing images are preserved
      // []         → deleteMany (intentional clear by the user)
      // [...]      → deleteMany + createMany (replace)
      ...(images !== undefined ? {
        images: images.length > 0 ? {
          deleteMany: {},
          createMany: {
            data: images.map((img: { url: string }) => ({ url: img.url })),
          },
        } : { deleteMany: {} }
      } : {}),

      // flightDetails are managed separately in the transaction below
      // (delete-then-recreate only when flightDetails are explicitly provided).
      // Do NOT include a deleteMany here — it would wipe flight details on
      // every update regardless of whether the caller intended to change them.
    }

    // Capture original for audit logging
    const originalTourPackageQuery = await prismadb.tourPackageQuery.findUnique({
      where: { id: params.tourPackageQueryId },
      include: { associatePartner: true, location: true }
    });

    // IMPORTANT: Capture old itineraries BEFORE deletion for variant remapping
    const oldItineraries = await prismadb.itinerary.findMany({
      where: { tourPackageQueryId: params.tourPackageQueryId },
      select: { id: true, dayNumber: true }
    });
    console.log(`📋 [PRE-DELETE] Captured ${oldItineraries.length} old itineraries:`,
      oldItineraries.map(i => `Day ${i.dayNumber}: ${i.id}`)
    );

    // Use transaction with fallback strategy for itinerary operations
    try {
      await prismadb.$transaction(async (tx) => {
        // First update the main tour package query data
        await tx.tourPackageQuery.update({
          where: { id: params.tourPackageQueryId },
          data: tourPackageUpdateData as any
        });

        // Handle itineraries separately with parallel processing for better performance
        if (itineraries && Array.isArray(itineraries) && itineraries.length > 0) {
          console.log(`[TRANSACTION] Processing ${itineraries.length} itineraries in parallel`);

          // Delete existing itineraries within the transaction
          await tx.itinerary.deleteMany({
            where: { tourPackageQueryId: params.tourPackageQueryId }
          });
          console.log(`[TRANSACTION] Deleted existing itineraries`);

          // Track ID mapping for variant features
          const itineraryIdMap: Record<string, string> = {};

          // Create new itineraries in parallel for better performance
          const createdItins = await Promise.all(itineraries.map(async (itinerary, i) => {
            try {
              console.log(`[TRANSACTION] Creating itinerary ${i + 1}/${itineraries.length}: ${itinerary.itineraryTitle?.substring(0, 50)}...`);
              const created = await createItineraryAndActivitiesInTransaction(itinerary, params.tourPackageQueryId, tx);
              return { oldId: itinerary.id, newId: created.id };
            } catch (itineraryError: any) {
              console.error('[ITINERARY_CREATION_ERROR_IN_TRANSACTION]', {
                itineraryIndex: i,
                itineraryTitle: itinerary.itineraryTitle,
                error: itineraryError
              });
              throw new Error(`Failed to create itinerary ${i + 1} "${itinerary.itineraryTitle}": ${itineraryError?.message || 'Unknown error'}`);
            }
          }));

          createdItins.forEach(item => {
            if (item && item.oldId && item.newId) {
              itineraryIdMap[item.oldId] = item.newId;
            }
          });

          // Second update to replace variant JSON mappings with actual Database UUIDs.
          // For fields not sent in the body, fall back to the pre-save DB value so that
          // stale itinerary IDs (from the delete-recreate cycle) are always remapped.
          if (Object.keys(itineraryIdMap).length > 0) {
            const orig = originalTourPackageQuery as any;
            const effectiveOverrides = hasBodyKey('variantHotelOverrides') ? variantHotelOverrides : orig?.variantHotelOverrides;
            const effectiveRooms = hasBodyKey('variantRoomAllocations') ? variantRoomAllocations : orig?.variantRoomAllocations;
            const effectiveTransport = hasBodyKey('variantTransportDetails') ? variantTransportDetails : orig?.variantTransportDetails;

            const remappedOverrides = effectiveOverrides ? remapVariantDataKeys(effectiveOverrides, itineraryIdMap) : undefined;
            const remappedRooms = effectiveRooms ? remapVariantDataKeys(effectiveRooms, itineraryIdMap) : undefined;
            const remappedTransport = effectiveTransport ? remapVariantDataKeys(effectiveTransport, itineraryIdMap) : undefined;

            await tx.tourPackageQuery.update({
              where: { id: params.tourPackageQueryId },
              data: {
                ...(remappedOverrides !== undefined ? { variantHotelOverrides: remappedOverrides as object } : {}),
                ...(remappedRooms !== undefined ? { variantRoomAllocations: remappedRooms as object } : {}),
                ...(remappedTransport !== undefined ? { variantTransportDetails: remappedTransport as object } : {}),
              }
            });
            console.log(`[TRANSACTION] Successfully remapped variant JSON keys for ${Object.keys(itineraryIdMap).length} itineraries`);
          }

          console.log(`[TRANSACTION] Successfully created all ${itineraries.length} itineraries`);
        } else if (itineraries && Array.isArray(itineraries) && itineraries.length === 0) {
          // If itineraries array is explicitly empty, delete all existing itineraries
          console.log(`[TRANSACTION] Deleting all itineraries as empty array was provided`);
          await tx.itinerary.deleteMany({
            where: { tourPackageQueryId: params.tourPackageQueryId }
          });
        }
        // If itineraries is undefined/null, don't touch existing itineraries        // Handle flight details with images
        // Handle flight details with images in parallel
        if (flightDetails && Array.isArray(flightDetails) && flightDetails.length > 0) {
          console.log(`[TRANSACTION] Processing ${flightDetails.length} flight details in parallel`);

          // Delete existing flight details first
          await tx.flightDetails.deleteMany({
            where: { tourPackageQueryId: params.tourPackageQueryId }
          });
          console.log(`[TRANSACTION] Deleted existing flight details`);

          // Create new flight details in parallel for better performance
          await Promise.all(flightDetails.map(async (flightDetail, i) => {
            try {
              console.log(`[TRANSACTION] Creating flight detail ${i + 1}/${flightDetails.length}: ${flightDetail.flightName || 'Unknown Flight'}`);
              await createFlightDetailWithImages(flightDetail, params.tourPackageQueryId, tx);
            } catch (flightError: any) {
              console.error('[FLIGHT_CREATION_ERROR_IN_TRANSACTION]', {
                flightIndex: i,
                flightName: flightDetail.flightName,
                error: flightError
              });
              throw new Error(`Failed to create flight detail ${i + 1} "${flightDetail.flightName}": ${flightError?.message || 'Unknown error'}`);
            }
          }));
          console.log(`[TRANSACTION] Successfully created all ${flightDetails.length} flight details`);
        }
      }, {
        maxWait: 10000, // Maximum time to wait for a transaction slot (10 seconds)
        timeout: 50000, // Maximum time to run the transaction (50 seconds) - increased for complex operations
      });
    } catch (transactionError: any) {
      console.error('[TRANSACTION_FAILED] Attempting fallback strategy', transactionError);

      // If transaction fails, try fallback approach with smaller operations
      if (transactionError.code === 'P2028' || transactionError.message?.includes('Transaction')) {
        console.log('[FALLBACK] Using non-transactional approach for itineraries');

        // First update the main tour package query data outside transaction
        await prismadb.tourPackageQuery.update({
          where: { id: params.tourPackageQueryId },
          data: tourPackageUpdateData as any
        });

        // Handle itineraries with fallback approach
        if (itineraries && Array.isArray(itineraries) && itineraries.length > 0) {
          console.log(`[FALLBACK] Processing ${itineraries.length} itineraries with fallback strategy`);

          // Delete existing itineraries
          await prismadb.itinerary.deleteMany({
            where: { tourPackageQueryId: params.tourPackageQueryId }
          });
          console.log(`[FALLBACK] Deleted existing itineraries`);

          const fallbackItineraryIdMap: Record<string, string> = {};

          // Create new itineraries one by one with individual error handling
          for (let i = 0; i < itineraries.length; i++) {
            const itinerary = itineraries[i];
            try {
              console.log(`[FALLBACK] Creating itinerary ${i + 1}/${itineraries.length}: ${itinerary.itineraryTitle?.substring(0, 50)}...`);
              const created = await createItineraryAndActivities(itinerary, params.tourPackageQueryId);
              if (itinerary.id && created.id) {
                fallbackItineraryIdMap[itinerary.id] = created.id;
              }
            } catch (itineraryError: any) {
              console.error('[FALLBACK_ITINERARY_ERROR]', {
                itineraryIndex: i,
                itineraryTitle: itinerary.itineraryTitle,
                error: itineraryError
              });
              // Throw immediately — itineraries have already been deleted above.
              // Silently continuing would leave the record with fewer itineraries
              // than the user saved, with no indication that data was lost.
              throw new Error(
                `Fallback failed: could not recreate itinerary ${i + 1} "${itinerary.itineraryTitle}": ${itineraryError?.message || 'Unknown error'}`
              );
            }
          }

          if (Object.keys(fallbackItineraryIdMap).length > 0) {
            await prismadb.tourPackageQuery.update({
              where: { id: params.tourPackageQueryId },
              data: {
                variantHotelOverrides: variantHotelOverrides ? remapVariantDataKeys(variantHotelOverrides, fallbackItineraryIdMap) as object : undefined,
                variantRoomAllocations: variantRoomAllocations ? remapVariantDataKeys(variantRoomAllocations, fallbackItineraryIdMap) as object : undefined,
                variantTransportDetails: variantTransportDetails ? remapVariantDataKeys(variantTransportDetails, fallbackItineraryIdMap) as object : undefined,
              }
            });
            console.log(`[FALLBACK] Successfully remapped variant JSON keys for ${Object.keys(fallbackItineraryIdMap).length} itineraries`);
          }

          console.log(`[FALLBACK] Completed processing itineraries with fallback strategy`);
        }

        // Handle flight details with fallback approach
        if (flightDetails && Array.isArray(flightDetails) && flightDetails.length > 0) {
          console.log(`[FALLBACK] Processing ${flightDetails.length} flight details with fallback strategy`);

          // Delete existing flight details
          await prismadb.flightDetails.deleteMany({
            where: { tourPackageQueryId: params.tourPackageQueryId }
          });
          console.log(`[FALLBACK] Deleted existing flight details`);

          // Create new flight details one by one with individual error handling
          for (let i = 0; i < flightDetails.length; i++) {
            const flightDetail = flightDetails[i];
            try {
              console.log(`[FALLBACK] Creating flight detail ${i + 1}/${flightDetails.length}: ${flightDetail.flightName || 'Unknown Flight'}`);
              await createFlightDetailWithImagesFallback(flightDetail, params.tourPackageQueryId);
            } catch (flightError: any) {
              console.error('[FALLBACK_FLIGHT_ERROR]', {
                flightIndex: i,
                flightName: flightDetail.flightName,
                error: flightError
              });
              // Throw immediately — flight details have already been deleted above.
              // Silently continuing would leave the record missing flight data
              // with no indication of the loss.
              throw new Error(
                `Fallback failed: could not recreate flight detail ${i + 1} "${flightDetail.flightName || 'Unknown Flight'}": ${flightError?.message || 'Unknown error'}`
              );
            }
          }
          console.log(`[FALLBACK] Completed processing flight details with fallback strategy`);
        }
      } else {
        // If it's not a transaction timeout, re-throw the error
        throw transactionError;
      }
    }

    const tourPackageQuery = await prismadb.tourPackageQuery.findUnique({
      where: { id: params.tourPackageQueryId },
      include: {
        associatePartner: true,
        location: true,
        flightDetails: {
          include: {
            images: true,
          }
        },
        images: true,
        itineraries: {
          include: {
            itineraryImages: true,
            activities: {
              include: {
                activityImages: true,
              }
            },
            location: true,
            hotel: true,
            roomAllocations: {
              include: {
                roomType: true,
                occupancyType: true,
                mealPlan: true,
                extraBeds: {
                  include: {
                    occupancyType: true
                  }
                }
              }
            },
            transportDetails: {
              include: {
                vehicleType: true
              }
            }
          },
          orderBy: [
            { dayNumber: 'asc' },
            { days: 'asc' }
          ]
        },
      }
    });

    // Only refresh snapshots when the caller explicitly sent a variant-affecting
    // field. If the user didn't touch the Variants tab, the form should omit
    // these keys — and we must not rebuild snapshots from master PackageVariant
    // data on every save, which was destroying user-edited pricing.
    const variantFieldsTouched =
      hasBodyKey('selectedVariantIds') ||
      hasBodyKey('variantHotelOverrides') ||
      hasBodyKey('variantPricingData') ||
      hasBodyKey('variantRoomAllocations') ||
      hasBodyKey('variantTransportDetails');

    const shouldRefreshSnapshots =
      variantFieldsTouched &&
      Array.isArray(selectedVariantIds) &&
      selectedVariantIds.length > 0;

    const shouldClearVariantSnapshots =
      hasBodyKey('selectedVariantIds') &&
      Array.isArray(selectedVariantIds) &&
      selectedVariantIds.length === 0;

    const shouldClearVariantJson =
      shouldClearVariantSnapshots &&
      hasBodyKey('customQueryVariants') &&
      Array.isArray(customQueryVariants) &&
      customQueryVariants.length === 0;

    if (shouldClearVariantSnapshots) {
      console.log('🗑️ Clearing variant snapshots (selectedVariantIds cleared)...');
      await deleteVariantSnapshots(params.tourPackageQueryId);
    }

    if (shouldClearVariantJson) {
      await prismadb.tourPackageQuery.update({
        where: { id: params.tourPackageQueryId },
        data: {
          variantHotelOverrides: {},
          variantRoomAllocations: {},
          variantTransportDetails: {},
          variantPricingData: {},
          confirmedVariantId: null,
        },
      });
    }

    if (shouldRefreshSnapshots) {
      // Let snapshot errors propagate. Previously they were swallowed and the
      // API returned 200 even when snapshots had been wiped — the exact failure
      // mode users were reporting as "variants/pricing deleted on save".
      console.log(`📸 Updating variant snapshots for ${selectedVariantIds.length} variants...`);
      await createVariantSnapshots(params.tourPackageQueryId, selectedVariantIds, {
        overwrite: true,
        tourPackageId: selectedTemplateId ?? undefined,
      });
      console.log('✅ Variant snapshots updated successfully');

      // Re-fetch post-transaction state. The main transaction may have remapped
      // itinerary IDs (delete-recreate) and written new variantHotelOverrides /
      // variantPricingData to the DB. Using the pre-transaction `tourPackageQuery`
      // here would apply stale overrides (old hotel, old itinerary IDs).
      const freshQuery = await prismadb.tourPackageQuery.findUnique({
        where: { id: params.tourPackageQueryId },
        select: {
          variantHotelOverrides: true,
          variantPricingData: true,
          tourStartsFrom: true,
          tourEndsOn: true,
          itineraries: { select: { id: true, dayNumber: true } },
        },
      });

      // Apply query-level hotel overrides on top of the package-default hotel snapshots
      const savedOverrides = freshQuery?.variantHotelOverrides as Record<string, Record<string, string>> | null;
      if (savedOverrides && Object.keys(savedOverrides).length > 0 && freshQuery?.itineraries) {
        await applyVariantHotelOverrides(
          params.tourPackageQueryId,
          savedOverrides,
          freshQuery.itineraries.map((i: any) => ({ id: i.id, dayNumber: i.dayNumber }))
        );
      }

      // Apply query-level pricing overrides so user-edited pricing doesn't
      // get clobbered by the master PackageVariant pricing on every save.
      const savedPricing = freshQuery?.variantPricingData as Record<string, any> | null;
      if (savedPricing && Object.keys(savedPricing).length > 0) {
        await applyVariantPricingOverrides(
          params.tourPackageQueryId,
          savedPricing,
          {
            startDate: freshQuery?.tourStartsFrom ?? null,
            endDate: freshQuery?.tourEndsOn ?? null,
          }
        );
      }
    } else if (variantFieldsTouched && !shouldClearVariantSnapshots) {
      // Variant override fields were updated but selectedVariantIds was not sent
      // (e.g. Hotels tab saved variantHotelOverrides only). Apply overrides directly
      // to existing snapshots without a full template rebuild.
      const freshQuery = await prismadb.tourPackageQuery.findUnique({
        where: { id: params.tourPackageQueryId },
        select: {
          variantHotelOverrides: true,
          variantPricingData: true,
          tourStartsFrom: true,
          tourEndsOn: true,
          itineraries: { select: { id: true, dayNumber: true } },
        },
      });

      if (hasBodyKey('variantHotelOverrides')) {
        const savedOverrides = freshQuery?.variantHotelOverrides as Record<string, Record<string, string>> | null;
        if (savedOverrides && Object.keys(savedOverrides).length > 0 && freshQuery?.itineraries) {
          await applyVariantHotelOverrides(
            params.tourPackageQueryId,
            savedOverrides,
            freshQuery.itineraries.map((i: any) => ({ id: i.id, dayNumber: i.dayNumber }))
          );
        }
      }

      if (hasBodyKey('variantPricingData')) {
        const savedPricing = freshQuery?.variantPricingData as Record<string, any> | null;
        if (savedPricing && Object.keys(savedPricing).length > 0) {
          await applyVariantPricingOverrides(
            params.tourPackageQueryId,
            savedPricing,
            {
              startDate: freshQuery?.tourStartsFrom ?? null,
              endDate: freshQuery?.tourEndsOn ?? null,
            }
          );
        }
      }
    }

    // Log audit entry for update (best-effort)
    try {
      await createAuditLog({
        entityId: params.tourPackageQueryId,
        entityType: "TourPackageQuery",
        action: "UPDATE",
        before: originalTourPackageQuery,
        after: tourPackageQuery,
        userRole: "ADMIN",
        metadata: {
          tourPackageQueryNumber: tourPackageQuery?.tourPackageQueryNumber,
          tourPackageQueryName: tourPackageQuery?.tourPackageQueryName,
        }
      });
    } catch (e) {
      console.error('[TOURPACKAGE_QUERY_AUDIT_UPDATE]', e);
    }

    return NextResponse.json(tourPackageQuery);
  } catch (error: any) {
    console.error('[TOUR_PACKAGE_QUERY_PATCH]', error);

    // Handle specific Prisma errors
    if (error.code === 'P2028') {
      // Transaction timeout error
      return new NextResponse("Update operation timed out due to large number of itineraries. Please try with fewer items or contact support.", { status: 408 });
    }

    if (error.code === 'P2025') {
      // Record not found error (relation issues)
      return new NextResponse("Tour package query not found or has been deleted. Please refresh and try again.", { status: 404 });
    }

    // Handle transaction errors
    if (error.message && error.message.includes('Transaction already closed')) {
      return new NextResponse("Operation timed out while processing itineraries. Please try again or reduce the number of itineraries.", { status: 408 });
    }

    // Handle itinerary creation errors
    if (error.message && error.message.includes('Failed to create itinerary')) {
      return new NextResponse(`Tour package query update failed: ${error.message}`, { status: 400 });
    }

    // Handle connection errors
    if (error.message && error.message.includes('Server has closed the connection')) {
      return new NextResponse("Database connection lost. Please try again.", { status: 503 });
    }

    return new NextResponse("Internal error occurred while updating tour package query", { status: 500 });
  }
};
