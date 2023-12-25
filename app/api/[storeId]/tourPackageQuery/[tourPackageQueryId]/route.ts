import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";

import prismadb from "@/lib/prismadb";

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
            activities:
              true,
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

    await prismadb.tourPackageQuery.update({
      where: {
        id: params.tourPackageQueryId
      },
      data: {
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
        // Delete existing nested relations
        flightDetails: { deleteMany: {} },
        images: { deleteMany: {} },
        itineraries: { deleteMany: {} },
      },
    });

    const tourPackageQuery = await prismadb.tourPackageQuery.update({
      where: {
        id: params.tourPackageQueryId,
      },
      data: {
        images: {
          createMany: {
            data: images.map((image: { url: any; }) => ({ url: image.url })),
          },
        },
        itineraries: {
          create: itineraries.map((itinerary: { itineraryTitle: any; itineraryDescription: any; days: any; hotelId: any; mealsIncluded: any; itineraryImages: any[]; activities: any[]; }) => ({
            itineraryTitle: itinerary.itineraryTitle,
            itineraryDescription: itinerary.itineraryDescription,
            days: itinerary.days,
            hotelId: itinerary.hotelId,
            mealsIncluded: itinerary.mealsIncluded,
            itineraryImages: {
              createMany: {
                data: itinerary.itineraryImages.map((img: { url: any; }) => ({ url: img.url })),
              },
            },
            activities: {
              create: itinerary.activities.map((activity: { title: any; description: any; activityImages: any[]; }) => ({
                title: activity.title,
                description: activity.description,
                activityImages: {
                  createMany: {
                    data: activity.activityImages.map((img: { url: any; }) => ({ url: img.url })),
                  },
                },
              })),
            },
          })),
        },
        flightDetails: {
          createMany: {
            data: flightDetails.map((detail: any) => ({
              // map flight detail fields here
            })),
          },
        },
      },
      include: {
        // Include the relations to return in the response
        images: true,
        itineraries: {
          include: {
            itineraryImages: true,
            activities: {
              include: {
                activityImages: true,
              },
            },
          },
        },
        flightDetails: true,
      },
    });

    return NextResponse.json(tourPackageQuery);
  } catch (error) {
    console.log('[tourPackage_QUERY_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};
