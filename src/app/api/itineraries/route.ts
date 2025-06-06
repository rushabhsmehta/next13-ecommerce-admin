import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";

import prismadb from "@/lib/prismadb";


export async function POST(
  req: Request,
) {
  try {
    const { userId } = auth();

    const body = await req.json();    const {
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
      roomAllocations,
      transportDetails,
      roomTypeId,
      mealPlanId,
      occupancyTypeId,
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




    // Create the main itinerary
    const itinerary = await prismadb.itinerary.create({
      data: {
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
        // Add relations to lookup tables if provided
        roomTypeId,
        mealPlanId,
        occupancyTypeId,
        itineraryImages: {
          createMany: {
            data: itineraryImages.map((img: { url: any; }) => ({ url: img.url })),
          },
        },
        // Create activities for this itinerary
        activities: {
          createMany: {
            data: activities.map((activity: { locationId: string, itineraryId: string, activityTitle: string; activityDescription: string; activityImages: { url: string }[]; }) => ({
              locationId: activity.locationId,
              itineraryId: activity.itineraryId,
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
    
    // Create room allocations if provided
    if (roomAllocations && roomAllocations.length > 0) {
      await Promise.all(roomAllocations.map(async (allocation: any) => {
        await prismadb.roomAllocation.create({
          data: {
            itineraryId: itinerary.id,
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
            itineraryId: itinerary.id,
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

    return NextResponse.json(itinerary);
  } catch (error) {
    console.log('[ITINERARY_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};


export async function GET(
  req: Request,
) {
  try {

    const itineraries = await prismadb.itinerary.findMany({

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

    return NextResponse.json(itineraries);
  } catch (error) {
    console.log('[ITINERARIES_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};

