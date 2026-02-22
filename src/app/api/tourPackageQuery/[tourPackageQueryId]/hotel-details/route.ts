import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

export async function PATCH(req: Request, props: { params: Promise<{ tourPackageQueryId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    const body = await req.json();
    const { itineraries } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.tourPackageQueryId) {
      return new NextResponse("Tour Package Query ID is required", { status: 400 });
    }

    if (!itineraries || !Array.isArray(itineraries)) {
      return new NextResponse("Itineraries data is required", { status: 400 });
    }

    // Verify that the tour package query exists
    const existingTourPackageQuery = await prismadb.tourPackageQuery.findUnique({
      where: {
        id: params.tourPackageQueryId,
      },
    });

    if (!existingTourPackageQuery) {
      return new NextResponse("Tour Package Query not found", { status: 404 });
    }

    // Process each itinerary
    for (const itinerary of itineraries) {
      // Update hotel assignment
      if (itinerary.hotelId) {
        await prismadb.itinerary.update({
          where: { id: itinerary.id },
          data: { hotelId: itinerary.hotelId },
        });
      }

      // Handle room allocations
      if (itinerary.roomAllocations && itinerary.roomAllocations.length > 0) {
        // Delete existing room allocations for this itinerary
        await prismadb.roomAllocation.deleteMany({
          where: { itineraryId: itinerary.id },
        });

        // Create new room allocations
        for (const roomAllocation of itinerary.roomAllocations) {
          if (roomAllocation.roomTypeId && roomAllocation.occupancyTypeId) {
            await prismadb.roomAllocation.create({
              data: {
                itineraryId: itinerary.id,
                roomTypeId: roomAllocation.roomTypeId,
                occupancyTypeId: roomAllocation.occupancyTypeId,
                mealPlanId: roomAllocation.mealPlanId || null,
                quantity: roomAllocation.quantity || 1,
                guestNames: roomAllocation.guestNames || null,
                notes: roomAllocation.notes || null,
                voucherNumber: roomAllocation.voucherNumber || null,
                customRoomType: roomAllocation.customRoomType || null,
              },
            });
          }
        }
      }

      // Handle transport details
      if (itinerary.transportDetails && itinerary.transportDetails.length > 0) {
        // Delete existing transport details for this itinerary
        await prismadb.transportDetail.deleteMany({
          where: { itineraryId: itinerary.id },
        });

        // Create new transport details
        for (const transportDetail of itinerary.transportDetails) {
          if (transportDetail.vehicleTypeId) {
            await prismadb.transportDetail.create({
              data: {
                itineraryId: itinerary.id,
                vehicleTypeId: transportDetail.vehicleTypeId,
                quantity: transportDetail.quantity || 1,
                description: transportDetail.description || null,
                pickupLocation: transportDetail.pickupLocation || null,
                dropLocation: transportDetail.dropLocation || null,
                isAirportPickupRequired: transportDetail.isAirportPickupRequired || false,
                isAirportDropRequired: transportDetail.isAirportDropRequired || false,
              },
            });
          }
        }
      }
    }

    // Fetch the updated tour package query to return
    const updatedTourPackageQuery = await prismadb.tourPackageQuery.findUnique({
      where: {
        id: params.tourPackageQueryId,
      },
      include: {
        itineraries: {
          include: {
            roomAllocations: {
              include: {
                roomType: true,
                occupancyType: true,
                mealPlan: true,
              },
            },
            transportDetails: {
              include: {
                vehicleType: true,
              },
            },
          },
          orderBy: {
            dayNumber: 'asc',
          },
        },
      },
    });

    return NextResponse.json(updatedTourPackageQuery);
  } catch (error) {
    console.log('[HOTEL_DETAILS_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
