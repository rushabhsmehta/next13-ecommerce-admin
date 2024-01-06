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

    const { activityMasterTitle, activityMasterDescription, activityMasterImages, locationId, itineraryId } = body; // Added itineraryId

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!activityMasterTitle) {
      return new NextResponse("Title is required", { status: 400 });
    }

    if (!activityMasterDescription) {
      return new NextResponse("Description is required", { status: 400 });
    }

    if (!locationId) {
      return new NextResponse("Location ID is required", { status: 400 });
    }

   /*  if (!activityImages || !activityImages.length) {
      return new NextResponse("Images are required", { status: 400 });
    } */

    
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

    const activityMaster = await prismadb.activityMaster.create({
      data: {
        activityMasterTitle,
        activityMasterDescription,
        locationId,
        itineraryId,
        storeId: params.storeId,
        activityMasterImages: {
          createMany: {
            data: [
              ...activityMasterImages.map((activityMasterImage: { url: string }) => activityMasterImage),
            ],
          },
        },
      }
    });

    return NextResponse.json(activityMaster);
  } catch (error) {
    console.log('[ACTIVITYMASTER_POST]', error);
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

    const activitiesMaster = await prismadb.activityMaster.findMany({
      where: {
        storeId: params.storeId
      },
      include: {
        activityMasterImages: true,
        location: true,
        //  hotel: true,
        // itineraries: true,  // Include itineraries here     
      },
      orderBy: {
        createdAt: 'desc',
      }
    });

    return NextResponse.json(activitiesMaster);
  } catch (error) {
    console.log('[ACTIVITESMASTER_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};
