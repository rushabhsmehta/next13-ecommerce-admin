import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import prismadb from "@/lib/prismadb";
import { parseArgs } from "util";
import { Images } from "@prisma/client";

export async function GET(req: Request, props: { params: Promise<{ itineraryId: string }> }) {
  const params = await props.params;
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

export async function DELETE(req: Request, props: { params: Promise<{ itineraryId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }



    if (!params.itineraryId) {
      return new NextResponse("Itinerary id is required", { status: 400 });
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


export async function PATCH(req: Request, props: { params: Promise<{ itineraryId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();

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

  
   

    

    const operations = [];    const itineraryUpdateData =
    {
      locationId,
      tourPackageId,  // Update tourPackageId
      tourPackageQueryId,  // Update tourPackageQueryId
      itineraryTitle,
      itineraryDescription,
      dayNumber,  // Update dayNumber
      days,  // Update days
      hotelId,  // Update hotelId
      numberofRooms,  // Update numberofRooms
      roomCategory,  // Update roomCategory
      mealsIncluded,  // Update mealsIncluded
      // Add relations to lookup tables if provided
      roomTypeId,
      mealPlanId,
      occupancyTypeId,
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
     
       // Delete existing room allocations and transport details
    operations.push(prismadb.roomAllocation.deleteMany({
      where: { itineraryId: params.itineraryId }
    }));
    
    operations.push(prismadb.transportDetail.deleteMany({
      where: { itineraryId: params.itineraryId }
    }));
    
    // Execute all database operations in a transaction
    await prismadb.$transaction(operations);
    
    // After the main transaction, create new room allocations if provided
    if (roomAllocations && roomAllocations.length > 0) {
      await Promise.all(roomAllocations.map(async (allocation: any) => {
        await prismadb.roomAllocation.create({
          data: {
            itineraryId: params.itineraryId,
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
    
    // Create new transport details if provided
    if (transportDetails && transportDetails.length > 0) {
      await Promise.all(transportDetails.map(async (transport: any) => {        await prismadb.transportDetail.create({
          data: {
            itineraryId: params.itineraryId,
            vehicleTypeId: transport.vehicleTypeId,
            quantity: transport.quantity || 1,
            capacity: transport.capacity || null,
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

    const itinerary = await prismadb.itinerary.findUnique({
      where: { id: params.itineraryId },
      include: {
        location: true,
        itineraryImages: true,
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

    return NextResponse.json(itinerary);
  } catch (error) {
    console.log('[ITINERARY_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};
