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

    await prismadb.itinerary.update({
      where: {
        id: params.itineraryId,
      },
      data: {
        itineraryTitle,
        itineraryDescription,
        locationId,
        tourPackageId,  // Update tourPackageId
        tourPackageQueryId,  // Update tourPackageQueryId
        days,  // Update days
        hotelId,  // Update hotelId
        mealsIncluded,  // Update mealsIncluded
        itineraryImages: {
          deleteMany: {},
          createMany: {
            data: itineraryImages.map((img: { url: any; }) => ({ url: img.url })),
          },
        },
        activities: {
          deleteMany: {}
        }
      }
    });

    for (const activity of activities) {
      await prismadb.activity.create({
        data: {
          storeId : activity.storeId,
          locationId: activity.locationId,
          itineraryId: activity.itineraryId,
          title: activity.title,
          description: activity.description,
          // Create images for this activity
          activityImages: {
            createMany: {
              data: activity.activityImages.map((img: { url: any; }) => ({ url: img.url })),
            },
          },
        }
      });
      // Optionally handle the created activity, e.g., logging or further processing
    }

    const updatedItinerary = await prismadb.itinerary.findUnique({
      where: {
        id: params.itineraryId,
      },
      include: {
        itineraryImages: true,
        activities: {
          include: {
            activityImages: true,
          },
        },
      }
    });

   
    return NextResponse.json(updatedItinerary);
  } catch (error) {
    console.log('[ITINERARY_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};
