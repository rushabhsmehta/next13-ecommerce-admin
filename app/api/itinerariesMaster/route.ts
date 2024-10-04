import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";

import prismadb from "@/lib/prismadb";

// First, create the itinerary and get its id
async function createActivities(activity: { activityTitle: any; activityDescription: any; locationId: any; activityImages: any[]; }, itineraryMasterId: string) {
  return prismadb.activity.create({
    data: {
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
export async function POST(req: Request) {
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
      numberofRooms,
      roomCategory,
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


    const itineraryMaster = await prismadb.itineraryMaster.create({
      data: {
        locationId,
        tourPackageId,
        tourPackageQueryId,
        itineraryMasterTitle,
        itineraryMasterDescription,
        dayNumber,
        days,
        hotelId,
        numberofRooms,
        roomCategory,
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
        createActivities(activity, itineraryMaster.id)
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
) {
  try {
  
    const itinerariesMaster = await prismadb.itineraryMaster.findMany({
   
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

