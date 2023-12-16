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
        flightDetails : true,
        images: true,
        location: true,
        hotel: true,
        itineraries: {
          orderBy: {
            days: 'asc' // or 'desc' depending on desired order
          }
        },
      }
    });

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
      hotelDetails,
      inclusions,
      exclusions,
      paymentPolicy,
      usefulTip,
      cancellationPolicy,
      airlineCancellationPolicy,
      termsconditions,
      hotelId,
      images,
      itineraries,
      isFeatured,
      isArchived } = body;

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

    if (!hotelId) {
      return new NextResponse("Hotel id is required", { status: 400 });
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
        hotelDetails,
        inclusions,
        exclusions,
        paymentPolicy,
        usefulTip,
        cancellationPolicy,
        airlineCancellationPolicy,
        termsconditions,
        hotelId,
        flightDetails: {
          deleteMany: {},
        },
        images: {
          deleteMany: {},
        },
        itineraries:
        {
          deleteMany: {},
        },
        isFeatured,
        isArchived,
      },
    });

    const tourPackageQuery = await prismadb.tourPackageQuery.update({
      where: {
        id: params.tourPackageQueryId
      },
      data: {
        images: {
          createMany: {
            data: [
              ...images.map((image: { url: string }) => image),
            ],
          },
        },
        itineraries: {
          createMany: {
            data: [
              ...itineraries.map((itinerary: { days: string, activities: string, places: string, mealsIncluded: string }) => itinerary),
            ],
          },
        },
        flightDetails : {
          createMany : {
            data : [
              ...flightDetails.map((flightDetail : { date :string, from : string, to : string,    departureTime : string, arrivalTime :  string }) => flightDetail),
            ]
          }
        },
      }
    }
    )

    return NextResponse.json(tourPackageQuery);
  } catch (error) {
    console.log('[tourPackage_QUERY_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};
