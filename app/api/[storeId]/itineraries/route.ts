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

    const createdItinerary = await prismadb.itinerary.create({
      data: {
        storeId: params.storeId,
        locationId,
        tourPackageId,
        tourPackageQueryId,
        itineraryTitle,
        itineraryDescription,
        days,
        hotelId,
        mealsIncluded,
        itineraryImages: {
          createMany: {
            data: itineraryImages.map((img: { url: any; }) => ({ url: img.url })),
          },
        },
        // Create activities for this itinerary
        activities: {
          createMany: {
            data: activities.map((activity: { title: any; description: any; activityImages: any[]; }) => ({
              title: activity.title,
              description: activity.description,
              // Consider defining activityImages inside the map function
              activityImages: {
                createMany: {
                  data: activity.activityImages.map((img: { url: any; }) => ({ url: img.url })),
                },
              },
            })),
          },
        },
      }
    });

    return NextResponse.json(createdItinerary);
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
        //activityImages : true,
        location : true,
        //  hotel: true,
        // itineraries: true,  // Include itineraries here     
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
