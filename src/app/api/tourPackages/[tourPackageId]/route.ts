import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";

import prismadb from "@/lib/prismadb";
import { string } from "zod";
import { Activity } from "@prisma/client";

export async function GET(
  req: Request,
  { params }: { params: { tourPackageId: string } }
) {
  try {
    if (!params.tourPackageId) {
      return new NextResponse("Tour Package  id is required", { status: 400 });
    }

    const tourPackage = await prismadb.tourPackage.findUnique({
      where: {
        id: params.tourPackageId
      },
      include: {
        flightDetails: true,
        images: true,
        location: true,
        //hotel: true,
        itineraries: {
          include: {
            itineraryImages: true,
            activities: {
              include: {
                activityImages: true,
              }
            }
          },          orderBy: [
            { dayNumber: 'asc' },
            { days: 'asc' }
          ],
        },
      },
    },)
    return NextResponse.json(tourPackage);
  } catch (error) {
    console.log('[TOUR_PACKAGE__GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};

export async function DELETE(
  req: Request,
  { params }: { params: { tourPackageId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.tourPackageId) {
      return new NextResponse("Tour Package  Id is required", { status: 400 });
    }

    

    const tourPackage = await prismadb.tourPackage.delete({
      where: {
        id: params.tourPackageId
      },
    });

    return NextResponse.json(tourPackage);
  } catch (error) {
    console.log('[TOURPACKAGE__DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};

async function createItineraryAndActivities(itinerary: { itineraryTitle: any; itineraryDescription: any; locationId: any; tourPackageQueryId: any; dayNumber : any; days: any; hotelId: any; numberofRooms : any;  roomCategory : any; mealsIncluded: any; itineraryImages: any[]; activities: any[]; }, tourPackageId: any) {
  // First, create the itinerary and get its id
  const createdItinerary = await prismadb.itinerary.create({
    data: {
      itineraryTitle: itinerary.itineraryTitle,
      itineraryDescription: itinerary.itineraryDescription,
      locationId: itinerary.locationId,
      tourPackageId: tourPackageId,
      tourPackageQueryId: itinerary.tourPackageQueryId,
      dayNumber : itinerary.dayNumber,
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
      console.log("Received Activities is ", activity);
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
  }

  return createdItinerary;
}


export async function PATCH(
  req: Request,
  { params }: { params: { tourPackageId: string } }
) {
  try {
    const { userId } = auth();

    const body = await req.json();

    const {
      tourPackageName,
      tourPackageType,
      customerName,
      customerNumber,
      numDaysNight,
      locationId,
      period,
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
      flightDetails,
      //   hotelDetails,
      inclusions,
      exclusions,
      importantNotes,
      paymentPolicy,
      usefulTip,      cancellationPolicy,
      airlineCancellationPolicy,
      termsconditions,
      kitchenGroupPolicy,
      //disclaimer,
      // hotelId,
      images,
      itineraries,
      isFeatured,
      isArchived,
      assignedTo,
      assignedToMobileNumber,
      assignedToEmail,
      slug,
    } = body;

    console.log(flightDetails);

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.tourPackageId) {
      return new NextResponse("Tour Package id is required", { status: 400 });
    }

 /*    if (!tourPackageName) {
      return new NextResponse("Tour Package  Name is required", { status: 400 });
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
    } */

    // Process policy fields to ensure they're arrays and then convert to strings for Prisma
    const processedInclusions = Array.isArray(inclusions) ? inclusions : inclusions ? [inclusions] : [];
    const processedExclusions = Array.isArray(exclusions) ? exclusions : exclusions ? [exclusions] : [];
    const processedImportantNotes = Array.isArray(importantNotes) ? importantNotes : importantNotes ? [importantNotes] : [];
    const processedPaymentPolicy = Array.isArray(paymentPolicy) ? paymentPolicy : paymentPolicy ? [paymentPolicy] : [];
    const processedUsefulTip = Array.isArray(usefulTip) ? usefulTip : usefulTip ? [usefulTip] : [];    const processedCancellationPolicy = Array.isArray(cancellationPolicy) ? cancellationPolicy : cancellationPolicy ? [cancellationPolicy] : [];
    const processedAirlineCancellationPolicy = Array.isArray(airlineCancellationPolicy) ? airlineCancellationPolicy : airlineCancellationPolicy ? [airlineCancellationPolicy] : [];
    const processedTermsConditions = Array.isArray(termsconditions) ? termsconditions : termsconditions ? [termsconditions] : [];
    const processedKitchenGroupPolicy = Array.isArray(kitchenGroupPolicy) ? kitchenGroupPolicy : kitchenGroupPolicy ? [kitchenGroupPolicy] : [];
    
    // Convert arrays to JSON strings for Prisma
    const inclusionsString = JSON.stringify(processedInclusions);
    const exclusionsString = JSON.stringify(processedExclusions);
    const importantNotesString = JSON.stringify(processedImportantNotes);
    const paymentPolicyString = JSON.stringify(processedPaymentPolicy);
    const usefulTipString = JSON.stringify(processedUsefulTip);    const cancellationPolicyString = JSON.stringify(processedCancellationPolicy);
    const airlineCancellationPolicyString = JSON.stringify(processedAirlineCancellationPolicy);
    const termsConditionsString = JSON.stringify(processedTermsConditions);
    const kitchenGroupPolicyString = JSON.stringify(processedKitchenGroupPolicy);    const tourPackageUpdateData = {
      //  await prismadb.tourPackage.update({
      //  where: {
      //    id: params.tourPackageId
      //  },
      //    data: {
      tourPackageName,
      tourPackageType,
      customerName,
      customerNumber,
      numDaysNight,
      locationId,
      period,
      transport,
      pickup_location,
      inclusions: inclusionsString,
      exclusions: exclusionsString,
      importantNotes: importantNotesString,
      paymentPolicy: paymentPolicyString,
      usefulTip: usefulTipString,
      cancellationPolicy: cancellationPolicyString,
      airlineCancellationPolicy: airlineCancellationPolicyString,
      termsconditions: termsConditionsString,
      kitchenGroupPolicy: kitchenGroupPolicyString,
      pricePerChildwithSeatBelow5Years,
      totalPrice,
      pricingSection, // Add this line
     // disclaimer,
      isFeatured,
      isArchived,
      assignedTo,
      assignedToMobileNumber,
      assignedToEmail,
      slug,
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
      },      flightDetails : {
        deleteMany : {},
        createMany: {
          data: [
              ...flightDetails.map((flightDetail: { date: string, flightName: string, flightNumber: string, from: string, to: string, departureTime: string, arrivalTime: string, flightDuration: string }) => flightDetail),]
      }
      }
    };

    await prismadb.tourPackage.update({
      where: { id: params.tourPackageId },
      data: tourPackageUpdateData as any
    });


   /*  flightDetails.forEach((flightDetail: { date: string; flightName: string; flightNumber: string; from: string; to: string; departureTime: string; arrivalTime: string; flightDuration: string; tourPackageId: string; }) => {
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
        tourPackageId: params.tourPackageId,
      }

      operations.push(prismadb.flightDetails.create({ data: flightDetailData }));
    }
    );
 */

    
    if (itineraries && itineraries.length > 0) {
      // Map each itinerary to a promise to create the itinerary and its activities
      const itineraryPromises = itineraries.map((itinerary : any)=> 
        createItineraryAndActivities(itinerary, params.tourPackageId)
      );

      // Wait for all itinerary promises to resolve
      await Promise.all(itineraryPromises);
    }



    const tourPackage = await prismadb.tourPackage.findUnique({
      where: { id: params.tourPackageId },
      include: {
        location: true,
        flightDetails: true,
        images: true,        itineraries: {
          include: {
            itineraryImages: true,
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
      }
    });



    return NextResponse.json(tourPackage);
  } catch (error) {
    console.log('[TOURPACKAGE_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};
