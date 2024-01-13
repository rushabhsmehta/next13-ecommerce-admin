import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";

import prismadb from "@/lib/prismadb";

// First, create the itinerary and get its id
async function createActivities(activity: { activityTitle: any; activityDescription: any; locationId: any; activityImages: any[]; }, storeId: any, itineraryMasterId: string) {
  return prismadb.activity.create({
    data: {
      storeId: storeId,
      itineraryId: itineraryMasterId,
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
}

// POST function to create itinerary and activities
export async function POST(req: { json: () => any; }, { params }: any) {
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

    if (!userId) {
      return new Response("Unauthenticated", { status: 403 });
    }

    if (!locationId) {
      return new Response("Location ID is required", { status: 400 });
    }

    if (!itineraryMasterImages || !itineraryMasterImages.length) {
      return new Response("Images are required", { status: 400 });
    }

    if (!itineraryMasterTitle) {
      return new Response("Title is required", { status: 400 });
    }

    if (!itineraryMasterDescription) {
      return new Response("Description is required", { status: 400 });
    }

    if (!params.storeId) {
      return new Response("Store id is required", { status: 400 });
    }

    const storeByUserId = await prismadb.store.findFirst({
      where: {
        id: params.storeId,
        userId,
      }
    });

    if (!storeByUserId) {
      return new Response("Unauthorized", { status: 405 });
    }

    const itineraryMaster = await prismadb.itineraryMaster.create({
      data: {
        storeId: params.storeId,
        locationId,
        tourPackageId,
        tourPackageQueryId,
        itineraryMasterTitle,
        itineraryMasterDescription,
        dayNumber,
        days,
        hotelId,
        mealsIncluded,
        itineraryMasterImages: {
          createMany: {
            data: itineraryMasterImages.map((img: { url: any; }) => ({ url: img.url })),
          },
        },
      },
    });

    if (activities && activities.length > 0) {
      const activityPromises = activities.map((activity: any) =>
        createActivities(activity, params.storeId, itineraryMaster.id)
      );
      await Promise.all(activityPromises);
    }

    const createdItinerary = await prismadb.itinerary.findUnique({
      where: { id: itineraryMaster.id },
      include: {
          // Include relevant relations
      },
    });

    return new Response(JSON.stringify(createdItinerary), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.log('[ITINERARYMASTER_POST]', error);
    return new Response("Internal error", { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    if (!params.storeId) {
      return new NextResponse("Store id is required", { status: 400 });
    }

    const itinerariesMaster = await prismadb.itineraryMaster.findMany({
      where: {
        storeId: params.storeId
      },
      include: {
        location: true,
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

    return NextResponse.json(itinerariesMaster);
  } catch (error) {
    console.log('[ITINERARIESMASTER_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};

