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

    const { name, price, locationId, hotelId, images, itineraries, isFeatured, isArchived } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    if (!images || !images.length) {
      return new NextResponse("Images are required", { status: 400 });
    }

    if (!price) {
      return new NextResponse("Price is required", { status: 400 });
    }

    if (!locationId) {
      return new NextResponse("Location id is required", { status: 400 });
    }

    if (!hotelId) {
      return new NextResponse("Hotel id is required", { status: 400 });
    }

    if (!params.storeId) {
      return new NextResponse("Store id is required", { status: 400 });
    }

    const storeByUserId = await prismadb.store.findFirst({
      where: {
        id: params.storeId,
        userId
      }
    });

    if (!storeByUserId) {
      return new NextResponse("Unauthorized", { status: 405 });
    }

    const tourPackage = await prismadb.tourPackage.create({
      data: {
        name,
        price,
        isFeatured,
        isArchived,
        locationId,
        hotelId,
        storeId: params.storeId,
        images: {
          createMany: {
            data: [
              ...images.map((image: { url: string }) => image),
            ],
          },
        },
        itineraries: {
          createMany: {
            data: [
              ...itineraries.map((itinerary: { days : string, hotelId : string, activities : string[], places : string, mealsIncluded : string  }) => itinerary),
            ],
          },
        },          
      },
    });

    return NextResponse.json(tourPackage);
  } catch (error) {
    console.log('[TOURPACKAGE_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};

export async function GET(
  req: Request,
  { params }: { params: { storeId: string } },
) {
  try {
    const { searchParams } = new URL(req.url)
    const locationId = searchParams.get('locationId') || undefined;
    const hotelId = searchParams.get('hotelId') || undefined;
    const isFeatured = searchParams.get('isFeatured');

    if (!params.storeId) {
      return new NextResponse("Store id is required", { status: 400 });
    }

    const tourPackages = await prismadb.tourPackage.findMany({
      where: {
        storeId: params.storeId,
        locationId,
        hotelId,        
        isFeatured: isFeatured ? true : undefined,
        isArchived: false,
      },
      include: {
        images: true,
        location: true,
        hotel: true,
       // itineraries: true,  // Include itineraries here     
      },
      orderBy: {
        createdAt: 'desc',
      }
    });

    return NextResponse.json(tourPackages);
  } catch (error) {
    console.log('[TOUR_PACKAGES_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};
