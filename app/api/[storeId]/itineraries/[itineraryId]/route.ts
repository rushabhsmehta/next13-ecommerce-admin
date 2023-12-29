import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";

import prismadb from "@/lib/prismadb";
import { parseArgs } from "util";
import { Images } from "@prisma/client";

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
          orderBy: {
            createdAt: 'asc'
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

    itineraryImages.forEach((itineraryImage: any) => {
      console.log("Itinerary Image URL is :", itineraryImage.url)
    });


    activities.forEach((activity: any) => {
      activity.activityImages.forEach((activityImage: { url: any; }) => {
        console.log("Activity Image URL is :", activityImage.url)
      });
    });

    console.log("Data Received is : ", JSON.stringify(body, null, 2));


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

    const operations = [];
    const itineraryUpdateData =
    {
      locationId,
      tourPackageId,  // Update tourPackageId
      tourPackageQueryId,  // Update tourPackageQueryId
      itineraryTitle,
      itineraryDescription,
      days,  // Update days
      hotelId,  // Update hotelId
      mealsIncluded,  // Update mealsIncluded
      itineraryImages: itineraryImages && itineraryImages.length > 0 ? {
        deleteMany: {},
        createMany: {
          data: [
            ...itineraryImages.map((image: { url: string }) => image),
          ],
        },
      } : { deleteMany: {} },
      activities: {
        deleteMany: {},
      }
    }


    operations.push(prismadb.itinerary.update({
      where: { id: params.itineraryId },
      data: itineraryUpdateData
    }));

    activities.forEach((activity: { activityTitle: any; activityDescription: any; locationId: any; activityImages: any[]; }) => {
      const activityData = {
        storeId: params.storeId,
        itineraryId: params.itineraryId,
        activityTitle: activity.activityTitle,
        activityDescription: activity.activityDescription,
        locationId: activity.locationId,
        activityImages: activity.activityImages && activity.activityImages.length > 0 ? {
          createMany: {
            data: activity.activityImages.map((img) => ({ url: img.url })),
          },
        } : {},
      };

      operations.push(prismadb.activity.create({ data: activityData }));
    });
     
     
    await prismadb.$transaction(operations);

    const itinerary = await prismadb.itinerary.findUnique({
      where: { id: params.itineraryId },
      include: {
        location: true,
        itineraryImages: true,
        activities: {
          include: {
            activityImages: true,
          }
        }
      },
    });

    return NextResponse.json(itinerary);
  } catch (error) {
    console.log('[ITINERARY_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};
