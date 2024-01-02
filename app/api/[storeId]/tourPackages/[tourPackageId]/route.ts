import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";

import prismadb from "@/lib/prismadb";

export async function GET(
  req: Request,
  { params }: { params: { tourPackageId: string } }
) {
  try {
    if (!params.tourPackageId) {
      return new NextResponse("Tour Pacakge id is required", { status: 400 });
    }

    const tourPackage = await prismadb.tourPackage.findUnique({
      where: {
        id: params.tourPackageId
      },
      include: {
        images: true,
        location: true,
        hotel: true,
        itineraries: {
          include: {
            activities: true,
          },
          orderBy: {
            days: 'asc' // or 'desc' depending on desired order
          }
        },
      }
    });

    return NextResponse.json(tourPackage);
  } catch (error) {
    console.log('[TOUR_PACKAGE_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};

export async function DELETE(
  req: Request,
  { params }: { params: { tourPackageId: string, storeId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.tourPackageId) {
      return new NextResponse("Tour Package id is required", { status: 400 });
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

    const tourPackage = await prismadb.tourPackage.delete({
      where: {
        id: params.tourPackageId
      },
    });

    return NextResponse.json(tourPackage);
  } catch (error) {
    console.log('[TOURPACKAGE_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};


export async function PATCH(
  req: Request,
  { params }: { params: { tourPackageId: string, storeId: string } }
) {
  try {
    const { userId } = auth();

    const body = await req.json();

    const { name, price, locationId, hotelId, images, itineraries, isFeatured, isArchived } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.tourPackageId) {
      return new NextResponse("Tour Package id is required", { status: 400 });
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

    const storeByUserId = await prismadb.store.findFirst({
      where: {
        id: params.storeId,
        userId
      }
    });

    if (!storeByUserId) {
      return new NextResponse("Unauthorized", { status: 405 });
    }

    await prismadb.tourPackage.update({
      where: {
        id: params.tourPackageId
      },
      data: {
        name,
        price,
        locationId,
        hotelId,
        images: {
          deleteMany: {},
        },
        itineraries:
        {
          deleteMany: {},
        },
        isFeatured,
        isArchived,
      },
    });

    const tourPackage = await prismadb.tourPackage.update({
      where: {
        id: params.tourPackageId
      },
      data: {
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
              ...itineraries.map((itinerary: { days: string, hotelId: string, activities: string[], mealsIncluded: string }) => itinerary),
            ],
          },
        }
      }
    }
    )

    return NextResponse.json(tourPackage);
  } catch (error) {
    console.log('[tourPackage_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};