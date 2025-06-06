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
    const body = await req.json();    const {
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
      roomAllocations,
      transportDetails,
      roomTypeId,
      mealPlanId,
      occupancyTypeId,
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
        // Add relations to lookup tables if provided
        roomTypeId,
        mealPlanId,
        occupancyTypeId,
        itineraryMasterImages: {
          createMany: {
            data: itineraryMasterImages.map((img: { url: any; }) => ({ url: img.url })),
          },
        },
      },
    });    if (activities && activities.length > 0) {
      const activityPromises = activities.map((activity: any) =>
        createActivities(activity, itineraryMaster.id)
      );
      await Promise.all(activityPromises);
    }
    
    // Create room allocations if provided
    if (roomAllocations && roomAllocations.length > 0) {
      await Promise.all(roomAllocations.map(async (allocation: any) => {
        await prismadb.roomAllocation.create({
          data: {
            itineraryMasterId: itineraryMaster.id,
            roomTypeId: allocation.roomTypeId,
            occupancyTypeId: allocation.occupancyTypeId,
            mealPlanId: allocation.mealPlanId,
            quantity: allocation.quantity || 1,
            guestNames: allocation.guestNames,
            notes: allocation.notes
          }
        });
      }));
    }
    
    // Create transport details if provided
    if (transportDetails && transportDetails.length > 0) {
      await Promise.all(transportDetails.map(async (transport: any) => {
        await prismadb.transportDetail.create({          data: {
            itineraryMasterId: itineraryMaster.id,
            vehicleTypeId: transport.vehicleTypeId,
            quantity: transport.quantity || 1,
            isAirportPickupRequired: transport.isAirportPickupRequired,
            isAirportDropRequired: transport.isAirportDropRequired,
            pickupLocation: transport.pickupLocation,
            dropLocation: transport.dropLocation,
            description: transport.description,
            notes: transport.notes
          }
        });
      }));
    }

    const createdItinerary = await prismadb.itineraryMaster.findUnique({
      where: { id: itineraryMaster.id },
      include: {
        location: true,
        itineraryMasterImages: true,
        activities: {
          include: {
            activityImages: true,
          }
        },
        roomAllocations: {
          include: {
            roomType: true,
            occupancyType: true,
            mealPlan: true
          }
        },
        transportDetails: {
          include: {
            vehicleType: true
          }
        }
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


