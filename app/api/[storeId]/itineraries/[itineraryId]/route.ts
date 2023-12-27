import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";

import prismadb from "@/lib/prismadb";

export async function GET(
  req: Request,
  { params }: { params: { itineraryId: string } }
) {
  try {

    if (!params.itineraryId) {
      return new NextResponse("Itinerary id is required", { status: 400 });
    }

    const itinerary = await prismadb.itinerary.findUnique({
      where: {
        id: params.itineraryId
      },
      include: {
        location: true,
        itineraryImages: true,
        activities: {
          include: {
            activityImages: true,
          },
        }
      }
    });

    return NextResponse.json(itinerary);
  } catch (error) {
    console.log('[ITINERARY_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};

export async function DELETE(
  req: Request,
  { params }: { params: { itineraryId: string, storeId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }



    if (!params.itineraryId) {
      return new NextResponse("Itinerary id is required", { status: 400 });
    }

    const storeByUserId = await prismadb.store.findFirst({
      where: {
        id: params.storeId,
        userId,
      }
    });

    if (!storeByUserId) {
      return new NextResponse("Unauthorized", { status: 405 });
    }

    const itinerary = await prismadb.itinerary.delete({
      where: {
        id: params.itineraryId,
      }
    });

    return NextResponse.json(itinerary);
  } catch (error) {
    console.log('[ITINERARY_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};


export async function PATCH(
  req: Request,
  { params }: { params: { itineraryId: string, storeId: string } }
) {
  try {
    const { userId } = auth();

    const body = await req.json();

    const {
      itineraryTitle,
      itineraryDescription,
      itineraryImages,
      activities,
      locationId,
      tourPackageId,
      tourPackageQueryId,
      days,
      hotelId,
      mealsIncluded,
    } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!locationId) {
      return new NextResponse("Location ID is required", { status: 400 });
    }

    if (!itineraryImages || !itineraryImages.length) {
      return new NextResponse("Images are required", { status: 400 });
    }

    if (!itineraryTitle) {
      return new NextResponse("Title is required", { status: 400 });
    }

    if (!itineraryDescription) {
      return new NextResponse("Description is required", { status: 400 });
    }

    if (!params.storeId) {
      return new NextResponse("Store id is required", { status: 400 });
    }

    const storeByUserId = await prismadb.store.findFirst({
      where: {
        id: params.storeId,
        userId,
      }
    });

    if (!storeByUserId) {
      return new NextResponse("Unauthorized", { status: 405 });
    }

    const itinerary = await prismadb.itinerary.update({
      where: {
        id: params.itineraryId,
      },
      data: {
        locationId,
        tourPackageId,  // Update tourPackageId
        tourPackageQueryId,  // Update tourPackageQueryId
    
        itineraryTitle,
        itineraryDescription,
        days,  // Update days
        hotelId,  // Update hotelId
        mealsIncluded,  // Update mealsIncluded
        itineraryImages: {
          deleteMany: {},
          createMany: {
            data: itineraryImages.map((img: { url: string; }) => ({ url: img.url })),
          },
        },
        activities: {
          deleteMany: {},
          createMany: {data: activities.map((activity: { storeId : string, locationId : string, itineraryId : string,activityTitle: string; activityDescription: string; activityImages: { url : string }[]; }) => ({
            storeId: params.storeId,
            locationId: activity.locationId,
            itineraryId : activity.itineraryId,
            activityTitle: activity.activityTitle,
            activityDescription: activity.activityDescription,
            // Consider defining activityImages inside the map function
            activityImages: {
              createMany: {
                data: activity.activityImages.map((img: { url: string; }) => ({ url: img.url })),
              },
            },
          })),
        },
      },
    },
  });
  
    return NextResponse.json(itinerary);
  } catch (error) {
    console.log('[ITINERARY_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};
