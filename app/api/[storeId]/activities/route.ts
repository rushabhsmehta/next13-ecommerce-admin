import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

import prismadb from '@/lib/prismadb';

export async function POST(
  req: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    const { userId } = auth();

    const body = await req.json();

    const { activityTitle, activityDescription, activityImages, locationId, itineraryId } = body; // Added itineraryId

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!activityTitle) {
      return new NextResponse("Title is required", { status: 400 });
    }

    if (!activityDescription) {
      return new NextResponse("Description is required", { status: 400 });
    }

    if (!locationId) {
      return new NextResponse("Location ID is required", { status: 400 });
    }

    if (!activityImages || !activityImages.length) {
      return new NextResponse("Images are required", { status: 400 });
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

    const activity = await prismadb.activity.create({
      data: {
        activityTitle,
        activityDescription,
        locationId,
        itineraryId,
        storeId: params.storeId,
        activityImages: {
          createMany: {
            data: [
              ...activityImages.map((activityImage: { url: string }) => activityImage),
            ],
          },
        },
      }
    });

    return NextResponse.json(activity);
  } catch (error) {
    console.log('[ACTIVITY_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};

export async function GET(
  req: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    if (!params.storeId) {
      return new NextResponse("Store id is required", { status: 400 });
    }

    const activities = await prismadb.activity.findMany({
      where: {
        storeId: params.storeId
      },
      include: {
        activityImages: true,
        location: true,
        //  hotel: true,
        // itineraries: true,  // Include itineraries here     
      },
      orderBy: {
        createdAt: 'desc',
      }
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.log('[ACTIVITES_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};
