import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import prismadb from '@/lib/prismadb';
import { Prisma } from '@prisma/client';
 
export async function POST(
  req: Request,
) {
  try {
    const { userId } = await auth();

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
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId') || undefined;
    const destinationId = searchParams.get('destinationId') || undefined;
    const summaryParam = searchParams.get('summary');
    const limitParam = searchParams.get('limit');

    const summary = summaryParam ? ['true', '1'].includes(summaryParam.toLowerCase()) : false;
    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
    const limit = Number.isFinite(parsedLimit) && parsedLimit! > 0 ? Math.min(parsedLimit!, 100) : undefined;

    const baseWhere = {
      locationId,
      destinationId,
    } satisfies Prisma.HotelWhereInput;

    const orderBy = {
      createdAt: 'desc' as const,
    };

    if (summary) {
      const hotels = await prismadb.hotel.findMany({
        where: baseWhere,
        orderBy,
        take: limit,
        select: {
          id: true,
          name: true,
          link: true,
          createdAt: true,
          updatedAt: true,
          location: {
            select: {
              id: true,
              label: true,
              slug: true,
            },
          },
          destination: {
            select: {
              id: true,
              name: true,
            },
          },
          images: {
            select: {
              url: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
            take: 1,
          },
        },
      });

      const summaries = hotels.map((hotel) => ({
        id: hotel.id,
        name: hotel.name,
        link: hotel.link,
        locationId: hotel.location?.id ?? null,
        locationLabel: hotel.location?.label,
        locationSlug: hotel.location?.slug,
        destinationId: hotel.destination?.id ?? null,
        destinationName: hotel.destination?.name,
        heroImageUrl: hotel.images?.[0]?.url,
        createdAt: hotel.createdAt,
        updatedAt: hotel.updatedAt,
      }));

      return NextResponse.json(summaries);
    }

    const hotels = await prismadb.hotel.findMany({
      where: baseWhere,
      include: {
        images: true,
        location: true,
        destination: true,
      },
      orderBy,
      take: limit,
    });

    return NextResponse.json(hotels);
  } catch (error) {
    console.log('[HOTELS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};

