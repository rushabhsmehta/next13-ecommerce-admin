import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import prismadb from '@/lib/prismadb';

export async function POST(
  req: Request,
) {
  try {
    const { userId } = await auth();

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

    const activity = await prismadb.activity.create({
      data: {
        activityTitle,
        activityDescription,
        locationId,
        itineraryId,
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
) {
  try {
  
    const activities = await prismadb.activity.findMany({
   
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

