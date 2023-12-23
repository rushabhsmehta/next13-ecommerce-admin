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

    const { name, images, locationId } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }
 
    
    if (!locationId) {
      return new NextResponse("Location ID is required", { status: 400 });
    }

    if (!images || !images.length) {
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

    const hotel = await prismadb.hotel.create({
      data: {
        name,
        locationId,
        storeId: params.storeId,

        images: {
          createMany: {
              data: [
                  ...images.map((image: { url: string }) => image),
              ],
          },
      },
      }
    });
  
    return NextResponse.json(hotel);
  } catch (error) {
    console.log('[HOTEL_POST]', error);
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

    const hotels = await prismadb.hotel.findMany({
      where: {
        storeId: params.storeId
      },
      include: {
        images: true,
        location: true,
        //  hotel: true,
        // itineraries: true,  // Include itineraries here     
    },
    orderBy: {
        createdAt: 'desc',
    }
    });
  
    return NextResponse.json(hotels);
  } catch (error) {
    console.log('[HOTELS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};
