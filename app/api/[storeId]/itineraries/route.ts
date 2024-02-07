import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";

import prismadb from "@/lib/prismadb";


export async function POST(
  req: Request,
  { params }: { params: { storeId: string } }
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
      dayNumber,
      days,
      hotelId,
      numberofRooms,
      roomCategory,
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

    const itinerary = await prismadb.itinerary.create({
      data: {
        storeId: params.storeId,
        locationId,
        tourPackageId,
        tourPackageQueryId,
        itineraryTitle,
        itineraryDescription,
        dayNumber,
        days,
        hotelId,
        numberofRooms,
        roomCategory,
        mealsIncluded,
        itineraryImages: {
          createMany: {
            data: itineraryImages.map((img: { url: any; }) => ({ url: img.url })),
          },
        },
        // Create activities for this itinerary
        activities: {
          createMany: {
            data: activities.map((activity: { storeId : string, locationId : string, itineraryId : string,activityTitle: string; activityDescription: string; activityImages: { url : string }[]; }) => ({
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
      }
    });

    return NextResponse.json(itinerary);
  } catch (error) {
    console.log('[ITINERARY_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};


export async function GET(
  req: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    if (!params.storeId) {
      return new NextResponse("Store id is required", { status: 400 });
    }

    const itineraries = await prismadb.itinerary.findMany({
      where: {
        storeId: params.storeId
      },
      include: {
        location : true,
      /*   activities :
        {
        include : 
        {
          activityImages : true,
        },
      }, */
   },
    orderBy: {
        createdAt: 'desc',
    }
    });
  
    return NextResponse.json(itineraries);
  } catch (error) {
    console.log('[ITINERARIES_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};
