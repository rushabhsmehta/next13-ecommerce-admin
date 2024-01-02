import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";

import prismadb from "@/lib/prismadb";
import { string } from "zod";
import { Activity } from "@prisma/client";

export async function GET(
  req: Request,
  { params }: { params: { tourPackageQueryId: string } }
) {
  try {
    if (!params.tourPackageQueryId) {
      return new NextResponse("Tour Pacakge Query id is required", { status: 400 });
    }

    const tourPackageQuery = await prismadb.tourPackageQuery.findUnique({
      where: {
        id: params.tourPackageQueryId
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
          },
          orderBy: {
            days: 'asc'
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
  { params }: { params: { tourPackageQueryId: string, storeId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.tourPackageQueryId) {
      return new NextResponse("Tour Package Query Id is required", { status: 400 });
    }

    const storeByUserId = await prismadb.store.findFirst({
      where: {
        id: params.storeId,
        userId
      }
    });

    if (!storeByUserId) {
      return new NextResponse("Unauthorized", { status: 405 });
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

async function createItineraryAndActivities(itinerary: { storeId : string,  itineraryTitle: any; itineraryDescription: any; locationId: any; tourPackageId: any; days: any; hotelId: any; mealsIncluded: any; itineraryImages: any[]; activities: any[]; }, storeId: any, tourPackageQueryId: any) {
  // First, create the itinerary and get its id
  const createdItinerary = await prismadb.itinerary.create({
    data: {
      storeId: storeId,
      itineraryTitle: itinerary.itineraryTitle,
      itineraryDescription: itinerary.itineraryDescription,
      locationId: itinerary.locationId,
      tourPackageId: itinerary.tourPackageId,
      tourPackageQueryId: tourPackageQueryId,
      days: itinerary.days,
      hotelId: itinerary.hotelId,
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
    await Promise.all(itinerary.activities.map((activity: { storeId : string, activityTitle: any; activityDescription: any; locationId: any; activityImages: any[]; }) => {
      console.log("Received Activities is ", activity);
      return prismadb.activity.create({
        data: {
          storeId: storeId,          
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
  { params }: { params: { tourPackageQueryId: string, storeId: string } }
) {
  try {
    const { userId } = auth();

    const body = await req.json();

    const {
      tourPackageQueryName,
      customerName,
      numDaysNight,
      locationId,
      period,
      numAdults,
      numChild5to12,
      numChild0to5,
      price,
      flightDetails,
      //   hotelDetails,
      inclusions,
      exclusions,
      paymentPolicy,
      usefulTip,
      cancellationPolicy,
      airlineCancellationPolicy,
      termsconditions,
      // hotelId,
      images,
      itineraries,
      isFeatured,
      isArchived,
      assignedTo,
      assignedToMobileNumber,
      assignedToEmail,
    } = body;

    console.log(flightDetails);

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.tourPackageQueryId) {
      return new NextResponse("Tour Package id is required", { status: 400 });
    }

    if (!tourPackageQueryName) {
      return new NextResponse("Tour Package Query Name is required", { status: 400 });
    }

    if (!images || !images.length) {
      return new NextResponse("Images are required", { status: 400 });
    }

    if (!price) {
      return new NextResponse("Price is required", { status: 400 });
    }

    if (!locationId) {
      return new NextResponse("Location id is required", { status: 400 });
    }

    /* if (!hotelId) {
      return new NextResponse("Hotel id is required", { status: 400 });
    } */


    const storeByUserId = await prismadb.store.findFirst({
      where: {
        id: params.storeId,
        userId
      }
    });

    if (!storeByUserId) {
      return new NextResponse("Unauthorized", { status: 405 });
    }


    const operations = [];
    const tourPackageUpdateData =
    {

      //  await prismadb.tourPackageQuery.update({
      //  where: {
      //    id: params.tourPackageQueryId
      //  },
      //    data: {
      tourPackageQueryName,
      customerName,
      numDaysNight,
      locationId,
      period,
      numAdults,
      numChild5to12,
      numChild0to5,
      price,
      inclusions,
      exclusions,
      paymentPolicy,
      usefulTip,
      cancellationPolicy,
      airlineCancellationPolicy,
      termsconditions,
      isFeatured,
      isArchived,
      assignedTo,
      assignedToMobileNumber,
      assignedToEmail,

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

      flightDetails : {
        deleteMany : {}
      }
    }

    operations.push(prismadb.tourPackageQuery.update({
      where: { id: params.tourPackageQueryId },
      data: tourPackageUpdateData
    }));


    flightDetails.forEach((flightDetail: { date: string; flightName: string; flightNumber: string; from: string; to: string; departureTime: string; arrivalTime: string; flightDuration: string; tourPackageQueryId: string; }) => {
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

    itineraries.forEach(async (itinerary: any) => {

      await createItineraryAndActivities(itinerary, params.storeId, params.tourPackageQueryId);
    }
    )

    await prismadb.$transaction(operations);


    const tourPackageQuery = await prismadb.tourPackageQuery.findUnique({
      where: { id: params.tourPackageQueryId },
      include: {
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