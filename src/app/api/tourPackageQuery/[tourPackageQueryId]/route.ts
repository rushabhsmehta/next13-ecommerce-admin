import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { dateToUtc } from '@/lib/timezone-utils';

import prismadb from "@/lib/prismadb";
import { string } from "zod";
import { Activity } from "@prisma/client";



export async function GET(
  req: Request,
  { params }: { params: { tourPackageQueryId: string } }
) {
  try {
    if (!params.tourPackageQueryId) {
      return new NextResponse("Tour Package Query id is required", { status: 400 });
    }

    const tourPackageQuery = await prismadb.tourPackageQuery.findUnique({
      where: {
        id: params.tourPackageQueryId
      },
      include: {
        associatePartner: true,
        flightDetails: true,
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
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    },)
    return NextResponse.json(tourPackageQuery);
  } catch (error) {
    console.log('[TOUR_PACKAGE_QUERY_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
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





    const tourPackageQuery = await prismadb.tourPackageQuery.delete({
      where: {
        id: params.tourPackageQueryId
      },
    });

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

      // Skip invalid room allocations
      if (!roomAllocation.roomTypeId || !roomAllocation.occupancyTypeId) {
        console.log("WARNING: Missing required IDs for room allocation, skipping");
        return Promise.resolve();
      }

      return prismadb.roomAllocation.create({
        data: {
          itineraryId: createdItinerary.id,
          roomTypeId: roomAllocation.roomTypeId,
          occupancyTypeId: roomAllocation.occupancyTypeId,
          mealPlanId: roomAllocation.mealPlanId,
          quantity: roomAllocation.quantity || 1,
          guestNames: roomAllocation.guestNames || ""
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


export async function PATCH(
  req: Request,
  { params }: { params: { tourPackageQueryId: string } }
) {
  try {
    const { userId } = auth();

    const body = await req.json(); const {
      inquiryId,
      tourPackageQueryNumber,
      tourPackageQueryName,
      tourPackageQueryType,
      customerName,
      customerNumber,
      numDaysNight,
      locationId,
      period,
      tour_highlights,
      tourStartsFrom,
      tourEndsOn,
      transport,
      pickup_location,
      drop_location,
      numAdults,
      numChild5to12,
      numChild0to5,
      price,
      pricePerAdult,
      // New fields
      tourPackageTemplateName,
      selectedMealPlanId,
      occupancySelections,
      pricePerChildOrExtraBed,
      pricePerChild5to12YearsNoBed,
      pricePerChildwithSeatBelow5Years,
      totalPrice,
      pricingSection, // Add this line
      remarks,
      flightDetails,      inclusions,
      exclusions,
      importantNotes,
      paymentPolicy,
      usefulTip,
      cancellationPolicy,
      airlineCancellationPolicy,
      termsconditions,
      kitchenGroupPolicy,
      disclaimer,
      // hotelId,
      images,
      itineraries,
      assignedTo,
      assignedToMobileNumber,
      assignedToEmail,
      associatePartnerId, 
      selectedTemplateId,
      selectedTemplateType,
      isFeatured,
      isArchived
    } = body;

    //   console.log(flightDetails);

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.tourPackageQueryId) {
      return new NextResponse("Tour Package id is required", { status: 400 });
    }

    /*    if (!tourPackageQueryName) {
         return new NextResponse("Tour Package Query Name is required", { status: 400 });
       }
   
       if (!images || !images.length) {
         return new NextResponse("Images are required", { status: 400 });
       }
   
       if (!price) {
         return new NextResponse("Price is required", { status: 400 });
       } */

    if (!locationId) {
      return new NextResponse("Location id is required", { status: 400 });
    }

    /* if (!hotelId) {
      return new NextResponse("Hotel id is required", { status: 400 });
    } */    // Process policy fields to ensure they're arrays and keep them as JavaScript objects for Prisma
    const processedInclusions = Array.isArray(inclusions) ? inclusions : inclusions ? [inclusions] : [];
    const processedExclusions = Array.isArray(exclusions) ? exclusions : exclusions ? [exclusions] : [];
    const processedImportantNotes = Array.isArray(importantNotes) ? importantNotes : importantNotes ? [importantNotes] : [];
    const processedPaymentPolicy = Array.isArray(paymentPolicy) ? paymentPolicy : paymentPolicy ? [paymentPolicy] : [];
    const processedUsefulTip = Array.isArray(usefulTip) ? usefulTip : usefulTip ? [usefulTip] : [];
    const processedCancellationPolicy = Array.isArray(cancellationPolicy) ? cancellationPolicy : cancellationPolicy ? [cancellationPolicy] : [];
    const processedAirlineCancellationPolicy = Array.isArray(airlineCancellationPolicy) ? airlineCancellationPolicy : airlineCancellationPolicy ? [airlineCancellationPolicy] : [];
    const processedTermsConditions = Array.isArray(termsconditions) ? termsconditions : termsconditions ? [termsconditions] : [];
    const processedKitchenGroupPolicy = Array.isArray(kitchenGroupPolicy) ? kitchenGroupPolicy : kitchenGroupPolicy ? [kitchenGroupPolicy] : [];    const tourPackageUpdateData =
    {

      //  await prismadb.tourPackageQuery.update({
      //  where: {
      //    id: params.tourPackageQueryId
      //  },
      //    data: {
      inquiryId,
      tourPackageQueryNumber,
      tourPackageQueryName,
      tourPackageQueryType,
      customerName,
      customerNumber,
      numDaysNight,
      locationId,
      period,
      tour_highlights,      tourStartsFrom: dateToUtc(tourStartsFrom),
      tourEndsOn: dateToUtc(tourEndsOn),
      transport,
      pickup_location,
      drop_location,
      numAdults,
      numChild5to12,
      numChild0to5,
      price,
      pricePerAdult,
      pricePerChildOrExtraBed,
      pricePerChild5to12YearsNoBed,
      pricePerChildwithSeatBelow5Years,
      totalPrice,
      pricingSection, // Add this line
      remarks,
      inclusions: processedInclusions,
      exclusions: processedExclusions,
      importantNotes: processedImportantNotes,
      paymentPolicy: processedPaymentPolicy,
      usefulTip: processedUsefulTip,      cancellationPolicy: processedCancellationPolicy,
      airlineCancellationPolicy: processedAirlineCancellationPolicy,
      termsconditions: processedTermsConditions,
      kitchenGroupPolicy: processedKitchenGroupPolicy,
      disclaimer,
      isFeatured,
      isArchived, assignedTo,
      assignedToMobileNumber,
      assignedToEmail,
      associatePartnerId,      // Add template fields
      selectedTemplateId,
      selectedTemplateType,
      tourPackageTemplateName,      selectedMealPlanId,      // Store occupancy selections directly as JSON
      // This approach works better with Prisma's JSON field handling
      occupancySelections: occupancySelections || undefined,
      images: images && images.length > 0 ? {
        deleteMany: {},
        createMany: {
          data: [
            ...images.map((img: { url: string }) => img),
          ],
        },
      } : { deleteMany: {} },

      itineraries: {
        deleteMany: {},
      },

      flightDetails: {
        deleteMany: {},
        createMany: {
          data: [
            ...flightDetails.map((flightDetail: { date: string, flightName: string, flightNumber: string, from: string, to: string, departureTime: string, arrivalTime: string, flightDuration: string }) => flightDetail),]
        }
      }
    }    //  console.log('tourPackageUpdateData:', tourPackageUpdateData);

    await prismadb.tourPackageQuery.update({
      where: { id: params.tourPackageQueryId },
      data: tourPackageUpdateData as any
    });


    /*  flightDetails.forEach((flightDetail: { date: string; flightName: string; flightNumber: string; from: string; to: string; departureTime: string; arrivalTime: string; flightDuration: string; tourPackageQueryId: string; }) => {
       const flightDetailData =
       {
         date: flightDetail.date,
         flightName: flightDetail.flightName,
         flightNumber: flightDetail.flightNumber,
         from: flightDetail.from,
         to: flightDetail.to,
         departureTime: flightDetail.departureTime,
         arrivalTime: flightDetail.arrivalTime,
         flightDuration: flightDetail.flightDuration,
         tourPackageQueryId: params.tourPackageQueryId,
       }
 
       operations.push(prismadb.flightDetails.create({ data: flightDetailData }));
     }
     );
  */


    if (itineraries && itineraries.length > 0) {
      // Map each itinerary to a promise to create the itinerary and its activities
      const itineraryPromises = itineraries.map((itinerary: any) =>
        createItineraryAndActivities(itinerary, params.tourPackageQueryId)
      );

      // Wait for all itinerary promises to resolve
      await Promise.all(itineraryPromises);
    }

    const tourPackageQuery = await prismadb.tourPackageQuery.findUnique({
      where: { id: params.tourPackageQueryId },
      include: {

        associatePartner: true,
        location: true,
        flightDetails: true,
        images: true,
        itineraries: {
          include: {
            itineraryImages: true,
            activities: {
              include: {
                activityImages: true,
              }
            }
          },
        },
      }
    });



    return NextResponse.json(tourPackageQuery);
  } catch (error) {
    console.log('[tourPackage_QUERY_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};
