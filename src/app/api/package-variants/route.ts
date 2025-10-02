import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

// GET all variants for a specific tour package or query
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tourPackageId = searchParams.get("tourPackageId");
    const tourPackageQueryId = searchParams.get("tourPackageQueryId");

    if (!tourPackageId && !tourPackageQueryId) {
      return new NextResponse("tourPackageId or tourPackageQueryId is required", { status: 400 });
    }

    const where: any = {};
    if (tourPackageId) where.tourPackageId = tourPackageId;
    if (tourPackageQueryId) where.tourPackageQueryId = tourPackageQueryId;

    const variants = await prismadb.packageVariant.findMany({
      where,
      include: {
        variantHotelMappings: {
          include: {
            hotel: {
              include: {
                images: true,
              },
            },
            itinerary: true,
          },
          orderBy: {
            itinerary: {
              dayNumber: 'asc',
            },
          },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });

    return NextResponse.json(variants);
  } catch (error) {
    console.log('[PACKAGE_VARIANTS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// POST - Create a new package variant
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      name, 
      description, 
      tourPackageId, 
      tourPackageQueryId, 
      isDefault,
      sortOrder,
      priceModifier,
    } = body;

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    if (!tourPackageId && !tourPackageQueryId) {
      return new NextResponse("tourPackageId or tourPackageQueryId is required", { status: 400 });
    }

    const variant = await prismadb.packageVariant.create({
      data: {
        name,
        description,
        tourPackageId,
        tourPackageQueryId,
        isDefault: isDefault || false,
        sortOrder: sortOrder || 0,
        priceModifier: priceModifier || 0,
      },
    });

    return NextResponse.json(variant);
  } catch (error) {
    console.log('[PACKAGE_VARIANTS_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
