import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { dateToUtc } from '@/lib/timezone-utils';

import prismadb from "@/lib/prismadb";
import { string } from "zod";
import { Activity } from "@prisma/client";
import { createAuditLog } from "@/lib/utils/audit-logger";



export async function GET(
  req: Request,
  { params }: { params: { tourPackageQueryId: string } }
) {
  try {
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
            roomAllocations: true,
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
        packageVariants: {
          include: {
            variantHotelMappings: {
              include: {
                hotel: {
                  include: {
                    images: true,
                  },
                },
                itinerary: true,
              },
            },
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      }
    });
    
    console.log('[TOUR_PACKAGE_QUERY_GET] Query executed successfully');
    
    if (!tourPackageQuery) {
      console.log('[TOUR_PACKAGE_QUERY_GET] Tour package query not found');
      return new NextResponse("Tour package query not found", { status: 404 });
    }
    
    // 🔍 DEBUG: Log retrieved packageVariants
    console.log('📥 [API GET] Retrieved packageVariants:', {
      count: tourPackageQuery?.packageVariants?.length || 0,
      variants: tourPackageQuery?.packageVariants?.map(v => ({
        id: v.id,
        name: v.name,
        mappingsCount: v.variantHotelMappings?.length || 0,
        mappings: v.variantHotelMappings?.map(m => ({
          itineraryId: m.itineraryId,
          hotelId: m.hotelId,
          hotelName: m.hotel?.name
        }))
      }))
    });
    
    return NextResponse.json(tourPackageQuery);
  } catch (error: any) {
    console.error('[TOUR_PACKAGE_QUERY_GET] Error occurred:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
      fullError: error
    });
    return new NextResponse(`Internal error: ${error?.message || 'Unknown error'}`, { status: 500 });
  }
};

export async function DELETE(
  req: Request,
  { params }: { params: { tourPackageQueryId: string } }
) {
  try {
    const { userId } = auth();

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
    await Promise.all(itinerary.roomAllocations.map((roomAllocation: any) => {
      console.log("Creating room allocation with data:", roomAllocation);

      // Skip invalid room allocations - require occupancyTypeId and either roomTypeId OR customRoomType
      if (!roomAllocation.occupancyTypeId || (!roomAllocation.roomTypeId && !roomAllocation.customRoomType)) {
        console.log("WARNING: Missing required IDs for room allocation, skipping");
        return Promise.resolve();
      }

      return prismadb.roomAllocation.create({
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

// Transaction-safe version of createItineraryAndActivities - simplified for reliability
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
    // Step 1: Create the itinerary first (simplified to avoid nested transaction issues)
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
    });    // Step 2: Create itinerary images if they exist
    if (itinerary.itineraryImages && itinerary.itineraryImages.length > 0) {
      for (const image of itinerary.itineraryImages) {
        await tx.images.create({
          data: {
            itinerariesId: createdItinerary.id,
            url: image.url
          }
        });
      }
    }

    // Step 3: Create activities if they exist
    if (itinerary.activities && itinerary.activities.length > 0) {
      for (const activity of itinerary.activities) {
        const createdActivity = await tx.activity.create({
          data: {
            itineraryId: createdItinerary.id,
            activityTitle: activity.activityTitle,
            activityDescription: activity.activityDescription,
            locationId: activity.locationId,
          }
        });        // Create activity images if they exist
        if (activity.activityImages && activity.activityImages.length > 0) {
          for (const img of activity.activityImages) {
            await tx.images.create({
              data: {
                activitiesId: createdActivity.id,
                url: img.url
              }
            });
          }
        }
      }
    }

    // Step 4: Create room allocations if they exist
    if (itinerary.roomAllocations && itinerary.roomAllocations.length > 0) {
      const validRoomAllocations = itinerary.roomAllocations.filter((ra: any) => 
        ra.occupancyTypeId && (ra.roomTypeId || ra.customRoomType)
      );
        if (validRoomAllocations.length > 0) {
        for (const roomAllocation of validRoomAllocations) {
          await tx.roomAllocation.create({
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
        }
      }
    }

    // Step 5: Create transport details if they exist
    if (itinerary.transportDetails && itinerary.transportDetails.length > 0) {
      const validTransportDetails = itinerary.transportDetails.filter((td: any) => 
        td.vehicleTypeId
      );
        if (validTransportDetails.length > 0) {
        for (const transport of validTransportDetails) {
          await tx.transportDetail.create({
            data: {
              itineraryId: createdItinerary.id,
              vehicleTypeId: transport.vehicleTypeId,
              quantity: transport.quantity || 1,
              description: transport.description || ""
            }
          });
        }
      }
    }

    return createdItinerary;
  } catch (error) {
    console.error("TRANSACTION: Failed to create itinerary:", itinerary.itineraryTitle, error);
    throw error;
  }
}

// Helper function to create flight details with images
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

    // Create flight images if they exist
    if (flightDetail.images && flightDetail.images.length > 0) {
      for (const image of flightDetail.images) {
        await tx.images.create({
          data: {
            flightDetailsId: createdFlightDetail.id,
            url: image.url
          }
        });
      }
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
    console.error("FALLBACK: Failed to create flight detail with images:", error);
    throw error;
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { tourPackageQueryId: string } }
) {  try {
    const { userId } = auth();

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
      price,      pricePerAdult,
      pricePerChild5to12,
      pricePerChild0to5,
      totalPrice,
      pricingSection,
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
      itineraries,
      packageVariants
    } = body;

    // 🔍 DEBUG: Log received packageVariants
    console.log('📥 [API RECEIVE] packageVariants:', {
      received: !!packageVariants,
      type: typeof packageVariants,
      isArray: Array.isArray(packageVariants),
      length: packageVariants?.length,
      data: packageVariants
    });

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    if (!params.tourPackageQueryId) {
      return new NextResponse("Tour package query id is required", { status: 400 });
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
      price,      pricePerAdult,
      pricePerChild5to12,
      pricePerChild0to5,
      totalPrice,
      pricingSection,
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
      occupancySelections: occupancySelections || undefined,

      images: images && images.length > 0 ? {
        deleteMany: {},
        createMany: {
          data: [
            ...images.map((img: { url: string }) => img),
          ],
        },
      } : { deleteMany: {} },

      flightDetails: {
        deleteMany: {},
        // Note: Flight details with images will be created separately after this update
      }
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

        // Handle itineraries separately with sequential processing to avoid transaction issues
        if (itineraries && Array.isArray(itineraries) && itineraries.length > 0) {
          console.log(`[TRANSACTION] Processing ${itineraries.length} itineraries sequentially`);
          
          // Delete existing itineraries only within the transaction
          await tx.itinerary.deleteMany({
            where: { tourPackageQueryId: params.tourPackageQueryId }
          });
          console.log(`[TRANSACTION] Deleted existing itineraries`);

          // Create new itineraries sequentially to maintain transaction integrity
          for (let i = 0; i < itineraries.length; i++) {
            const itinerary = itineraries[i];
            try {
              console.log(`[TRANSACTION] Creating itinerary ${i + 1}/${itineraries.length}: ${itinerary.itineraryTitle?.substring(0, 50)}...`);
              await createItineraryAndActivitiesInTransaction(itinerary, params.tourPackageQueryId, tx);
            } catch (itineraryError: any) {
              console.error('[ITINERARY_CREATION_ERROR_IN_TRANSACTION]', {
                itineraryIndex: i,
                itineraryTitle: itinerary.itineraryTitle,
                error: itineraryError
              });
              throw new Error(`Failed to create itinerary ${i + 1} "${itinerary.itineraryTitle}": ${itineraryError?.message || 'Unknown error'}`);
            }
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
        if (flightDetails && Array.isArray(flightDetails) && flightDetails.length > 0) {
          console.log(`[TRANSACTION] Processing ${flightDetails.length} flight details`);
          
          // Delete existing flight details first
          await tx.flightDetails.deleteMany({
            where: { tourPackageQueryId: params.tourPackageQueryId }
          });
          console.log(`[TRANSACTION] Deleted existing flight details`);
          
          // Create new flight details sequentially to maintain transaction integrity
          for (let i = 0; i < flightDetails.length; i++) {
            const flightDetail = flightDetails[i];
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
          }
          console.log(`[TRANSACTION] Successfully created all ${flightDetails.length} flight details`);
        }
      }, {
        maxWait: 30000, // Maximum time to wait for a transaction slot (30 seconds)
        timeout: 60000, // Maximum time to run the transaction (60 seconds)
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

          // Create new itineraries one by one with individual error handling
          for (let i = 0; i < itineraries.length; i++) {
            const itinerary = itineraries[i];
            try {
              console.log(`[FALLBACK] Creating itinerary ${i + 1}/${itineraries.length}: ${itinerary.itineraryTitle?.substring(0, 50)}...`);
              await createItineraryAndActivities(itinerary, params.tourPackageQueryId);
            } catch (itineraryError: any) {
              console.error('[FALLBACK_ITINERARY_ERROR]', {
                itineraryIndex: i,
                itineraryTitle: itinerary.itineraryTitle,
                error: itineraryError
              });
              // In fallback mode, we continue with other itineraries but log the error
              // Don't throw to prevent losing all progress
            }
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
              // In fallback mode, we continue with other flights but log the error
              // Don't throw to prevent losing all progress
            }
          }
          console.log(`[FALLBACK] Completed processing flight details with fallback strategy`);
        }
      } else {
        // If it's not a transaction timeout, re-throw the error
        throw transactionError;
      }
    }

    // Handle Package Variants (after main transaction/fallback completes)    
    if (packageVariants && Array.isArray(packageVariants) && packageVariants.length > 0) {
      try {
        console.log(`🎨 [VARIANTS START] Processing ${packageVariants.length} package variants`);
        console.log('🎨 [VARIANTS DATA] Full variants:', JSON.stringify(packageVariants, null, 2));
        
        // Fetch current itineraries to map old IDs to new IDs by dayNumber
        const currentItineraries = await prismadb.itinerary.findMany({
          where: { tourPackageQueryId: params.tourPackageQueryId },
          select: { id: true, dayNumber: true }
        });
        console.log(`🔄 [ITINERARY MAPPING] Found ${currentItineraries.length} current itineraries`);

        // Create a map from dayNumber to new itinerary ID
        const dayNumberToNewIdMap = new Map<number, string>();
        currentItineraries.forEach(itin => {
          // dayNumber can be null in some records; guard against that for TypeScript and runtime safety
          if (typeof itin.dayNumber === 'number') {
            dayNumberToNewIdMap.set(itin.dayNumber, itin.id);
          } else {
            console.warn('[ITINERARY_MAPPING] Skipping itinerary with missing dayNumber:', itin.id, itin);
          }
        });

        // Create a mapping from old itinerary ID to dayNumber using the captured old itineraries
        const oldIdToDayNumberMap = new Map<string, number>();
        
        // Use the OLD itineraries we captured before deletion
        if (oldItineraries && Array.isArray(oldItineraries)) {
          oldItineraries.forEach(oldItin => {
            if (typeof oldItin.dayNumber === 'number') {
              oldIdToDayNumberMap.set(oldItin.id, oldItin.dayNumber);
              console.log(`📝 [OLD ITINERARY] ${oldItin.id} → Day ${oldItin.dayNumber}`);
            } else {
              console.warn('[OLD_ITINERARY] Skipping old itinerary with missing dayNumber:', oldItin.id, oldItin);
            }
          });
        }

        console.log(`🗺️ [MAPPING SETUP] DayNumber → NewID:`, Array.from(dayNumberToNewIdMap.entries()));
        console.log(`🗺️ [MAPPING SETUP] OldID → DayNumber:`, Array.from(oldIdToDayNumberMap.entries()));
        console.log(`✅ [MAPPING READY] Can now remap ${oldIdToDayNumberMap.size} old IDs to new IDs`);
        
        // Delete existing variants for this tour package query
        await prismadb.packageVariant.deleteMany({
          where: { tourPackageQueryId: params.tourPackageQueryId }
        });
        console.log('🗑️ [VARIANTS] Deleted existing variants');

        // Create new variants with hotel mappings
        for (const variant of packageVariants) {
          console.log(`✨ [VARIANT CREATE] Creating variant:`, {
            name: variant.name,
            hotelMappingsCount: Object.keys(variant.hotelMappings || {}).length,
            hotelMappings: variant.hotelMappings
          });
          
          const createdVariant = await prismadb.packageVariant.create({
            data: {
              name: variant.name,
              description: variant.description || null,
              isDefault: variant.isDefault || false,
              sortOrder: variant.sortOrder || 0,
              priceModifier: variant.priceModifier || 0,
              tourPackageQueryId: params.tourPackageQueryId,
            }
          });

          console.log(`✅ [VARIANT CREATED] ID: ${createdVariant.id}, Name: ${createdVariant.name}`);

          // Create hotel mappings for this variant, remapping itinerary IDs
          if (variant.hotelMappings && Object.keys(variant.hotelMappings).length > 0) {
            let mappings = Object.entries(variant.hotelMappings)
              .map(([oldItineraryId, hotelId]) => {
                // Try to find the new itinerary ID by:
                // 1. If the key is a numeric string, treat it as a dayNumber
                // 2. Otherwise check if oldItineraryId maps to a dayNumber, then get new ID from dayNumber
                let dayNumber: number | undefined = undefined;
                if (/^\d+$/.test(oldItineraryId)) {
                  dayNumber = parseInt(oldItineraryId, 10);
                  console.log(`🔎 [NUMERIC KEY] Interpreting mapping key '${oldItineraryId}' as dayNumber ${dayNumber}`);
                } else {
                  dayNumber = oldIdToDayNumberMap.get(oldItineraryId) as number | undefined;
                }
                let newItineraryId = oldItineraryId; // Default to old ID
                
                if (dayNumber !== undefined) {
                  // We found the dayNumber for this old ID, now get the new ID for that dayNumber
                  const mappedNewId = dayNumberToNewIdMap.get(dayNumber);
                  if (mappedNewId) {
                    newItineraryId = mappedNewId;
                    console.log(`🔗 [REMAP SUCCESS] OldID: ${oldItineraryId} → Day ${dayNumber} → NewID: ${newItineraryId}, Hotel: ${hotelId}`);
                  } else {
                    console.log(`⚠️ [REMAP WARNING] Day ${dayNumber} not found in new itineraries`);
                  }
                } else {
                  // Old ID doesn't map to a dayNumber, might be already a new ID or invalid
                  // Check if it exists in current itineraries
                  const existsInCurrent = currentItineraries.some(itin => itin.id === oldItineraryId);
                  if (existsInCurrent) {
                    console.log(`✅ [NO REMAP NEEDED] Itinerary ${oldItineraryId} already exists (current ID), Hotel: ${hotelId}`);
                  } else {
                    console.log(`❌ [REMAP FAILED] Cannot map itinerary ${oldItineraryId} - not in old or new itineraries, Hotel: ${hotelId}`);
                    return null; // Skip this mapping
                  }
                }
                
                return {
                  packageVariantId: createdVariant.id,
                  itineraryId: newItineraryId,
                  hotelId: hotelId as string,
                };
              })
              .filter(m => m !== null && m.hotelId && m.itineraryId); // Only create mappings where hotel and itinerary are selected

            // Fallback: if remapping produced no mappings but the client provided the same
            // number of hotel mappings as current itineraries, map by day order (index → day)
            if ((mappings.length === 0 || mappings.length < Object.keys(variant.hotelMappings).length) &&
                Object.keys(variant.hotelMappings).length > 0 &&
                currentItineraries.length > 0) {
              try {
                const hotelIds = Object.values(variant.hotelMappings);
                // Attempt fallback mapping by assigning provided hotelIds to earliest days in order.
                // This supports partial assignments (e.g., 2 hotels -> map to Day 1 & Day 2).
                console.log('🔁 [FALLBACK] Attempting day-order remap of hotel mappings (partial allowed)');
                const sortedItins = [...currentItineraries].sort((a, b) => (a.dayNumber ?? 0) - (b.dayNumber ?? 0));
                mappings = hotelIds.map((hotelId, idx) => {
                  const itin = sortedItins[idx];
                  if (!itin) return null;
                  return {
                    packageVariantId: createdVariant.id,
                    itineraryId: itin.id,
                    hotelId: hotelId as string,
                  };
                }).filter(Boolean) as any[];
                console.log(`🔁 [FALLBACK] Prepared ${mappings.length} fallback mappings by day order (partial)`);
              } catch (fbErr) {
                console.error('❌ [FALLBACK] Failed to prepare fallback mappings', fbErr);
              }
            }

            console.log(`🏨 [HOTEL MAPPINGS] Prepared ${mappings.length} mappings:`, mappings);

            if (mappings.length > 0) {
              try {
                await prismadb.variantHotelMapping.createMany({
                  data: mappings as any,
                  skipDuplicates: true,
                });
                console.log(`✅ [MAPPINGS SAVED] Created ${mappings.length} hotel mappings for variant: ${createdVariant.name}`);
              } catch (mappingError: any) {
                console.error(`❌ [MAPPING SAVE ERROR] Failed to save mappings:`, mappingError);
                // Try to clean up orphaned mappings if creation failed
                const validItineraryIds = currentItineraries.map(i => i.id);
                const invalidMappings = mappings.filter((m: any) => !validItineraryIds.includes(m.itineraryId));
                if (invalidMappings.length > 0) {
                  console.log(`⚠️ [INVALID MAPPINGS DETECTED] ${invalidMappings.length} mappings reference non-existent itineraries`);
                }
              }
            } else {
              console.log(`⚠️ [MAPPINGS EMPTY] No hotel mappings to save for variant: ${createdVariant.name}`);
            }
          } else {
            console.log(`⚠️ [NO MAPPINGS] Variant "${variant.name}" has no hotelMappings object or it's empty`);
          }
        }
        
        console.log('[VARIANTS] Successfully saved all package variants');
      } catch (variantError: any) {
        console.error('[VARIANT_SAVE_ERROR]', variantError);
        // Don't fail the entire request if variant save fails
        // Variants are optional feature
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
                mealPlan: true
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
