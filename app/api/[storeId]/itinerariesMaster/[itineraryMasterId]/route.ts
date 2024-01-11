import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";

import prismadb from "@/lib/prismadb";
import { parseArgs } from "util";
import { Images } from "@prisma/client";

export async function GET(
  req: Request,
  { params }: { params: { itineraryMasterId: string } }
) {
  try {

    if (!params.itineraryMasterId) {
      return new NextResponse("Itinerary id is required", { status: 400 });
    }

    const itineraryMaster = await prismadb.itineraryMaster.findUnique({
      where: {
        id: params.itineraryMasterId
      },
      include: {
        location: true,
        itineraryMasterImages: true,
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

    return NextResponse.json(itineraryMaster);
  } catch (error) {
    console.log('[ITINERARYMASTER_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};

export async function DELETE(
  req: Request,
  { params }: { params: { itineraryMasterId: string, storeId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }



    if (!params.itineraryMasterId) {
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

    const itineraryMaster = await prismadb.itineraryMaster.delete({
      where: {
        id: params.itineraryMasterId,
      }
    });

    return NextResponse.json(itineraryMaster);
  } catch (error) {
    console.log('[ITINERARYMASTER_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};


export async function PATCH(
  req: Request,
  { params }: { params: { itineraryMasterId: string, storeId: string } }
) {
  try {
    const { userId } = auth();

    const body = await req.json();

    const {
      itineraryMasterTitle,
      itineraryMasterDescription,
      itineraryMasterImages,
      activities,
      locationId,
      tourPackageId,
      tourPackageQueryId,
      dayNumber,
      days,
      hotelId,
      mealsIncluded,
    } = body;

    itineraryMasterImages.forEach((itineraryMasterImage: any) => {
      console.log("Itinerary Image URL is :", itineraryMasterImage.url)
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

    if (!itineraryMasterImages || !itineraryMasterImages.length) {
      return new NextResponse("Images are required", { status: 400 });
    }

    if (!itineraryMasterTitle) {
      return new NextResponse("Title is required", { status: 400 });
    }

    if (!itineraryMasterDescription) {
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
    const itineraryMasterUpdateData =
    {
      locationId,
      tourPackageId,  // Update tourPackageId
      tourPackageQueryId,  // Update tourPackageQueryId
      itineraryMasterTitle,
      itineraryMasterDescription,
      dayNumber,  // Update dayNumber
      days,  // Update days
      hotelId,  // Update hotelId
      mealsIncluded,  // Update mealsIncluded
      itineraryMasterImages: itineraryMasterImages && itineraryMasterImages.length > 0 ? {
        deleteMany: {},
        createMany: {
          data: [
            ...itineraryMasterImages.map((image: { url: string }) => image),
          ],
        },
      } : { deleteMany: {} },
      activities: {
        deleteMany: {},
      }
    }


    operations.push(prismadb.itineraryMaster.update({
      where: { id: params.itineraryMasterId },
      data: itineraryMasterUpdateData
    }));

    activities.forEach((activity: { activityTitle: any; activityDescription: any; locationId: any; activityImages: any[]; }) => {
      const activityData = {
        storeId: params.storeId,
        itineraryMasterId: params.itineraryMasterId,
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

    const itineraryMaster = await prismadb.itineraryMaster.findUnique({
      where: { id: params.itineraryMasterId },
      include: {
        location: true,
        itineraryMasterImages: true,
        activities: {
          include: {
            activityImages: true,
          }
        }
      },
    });

    return NextResponse.json(itineraryMaster);
  } catch (error) {
    console.log('[ITINERARY_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};
