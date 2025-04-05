import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function POST(
  req: Request,
) {
  try {
    const body = await req.json();

    const { 
      itineraryMasterTitle,
      itineraryMasterDescription,
      locationId,
      itineraryMasterImages,
      activities
    } = body;

    if (!locationId) {
      return new NextResponse("Location ID is required", { status: 400 });
    }

    if (!itineraryMasterTitle) {
      return new NextResponse("Itinerary title is required", { status: 400 });
    }

    // Create the master itinerary record
    const itineraryMaster = await prismadb.itineraryMaster.create({
      data: {
        itineraryMasterTitle,
        itineraryMasterDescription: itineraryMasterDescription || '',
        locationId,
        itineraryMasterImages: {
          createMany: {
            data: itineraryMasterImages?.map((image: { url: string }) => ({
              url: image.url
            })) || []
          }
        }
      }
    });

    // Add activities if they exist
    if (activities && activities.length > 0) {
      for (const activity of activities) {
        await prismadb.activity.create({
          data: {
            activityTitle: activity.activityTitle || '',
            activityDescription: activity.activityDescription || '',
            locationId: activity.locationId || locationId, // Use main locationId as fallback
            itineraryMasterId: itineraryMaster.id,
            activityImages: {
              createMany: {
                data: activity.activityImages?.map((image: { url: string }) => ({
                  url: image.url
                })) || []
              }
            }
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Master itinerary created successfully",
      data: itineraryMaster
    });
    
  } catch (error) {
    console.log('[ITINERARY_MASTER_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}