import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

import prismadb from '@/lib/prismadb';
 
export async function POST(
  req: Request,
) {
  try {
    const { userId } = auth();

    const body = await req.json();

    const { name, images, locationId, destinationId, link } = body; // Added destinationId

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

    const hotel = await prismadb.hotel.create({
      data: {
        name,
        locationId,
        destinationId: destinationId || null, // Added destinationId
        link, // Added link to create data
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
) {
  try {
  
    const hotels = await prismadb.hotel.findMany({
   
      include: {
        images: true,
        location: true,
        destination: true, // Include destination relationship
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

