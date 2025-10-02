import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

// POST - Bulk update hotel mappings for a variant
export async function POST(
  req: Request,
  { params }: { params: { variantId: string } }
) {
  try {
    const body = await req.json();
    const { mappings } = body;

    if (!params.variantId) {
      return new NextResponse("Variant ID is required", { status: 400 });
    }

    if (!mappings || !Array.isArray(mappings)) {
      return new NextResponse("Mappings array is required", { status: 400 });
    }

    // Delete existing mappings for this variant
    await prismadb.variantHotelMapping.deleteMany({
      where: {
        packageVariantId: params.variantId,
      },
    });

    // Create new mappings
    const createdMappings = await prismadb.variantHotelMapping.createMany({
      data: mappings.map((mapping: any) => ({
        packageVariantId: params.variantId,
        itineraryId: mapping.itineraryId,
        hotelId: mapping.hotelId,
      })),
    });

    // Fetch the updated variant with mappings
    const variant = await prismadb.packageVariant.findUnique({
      where: {
        id: params.variantId,
      },
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
    });

    return NextResponse.json(variant);
  } catch (error) {
    console.log('[VARIANT_HOTEL_MAPPINGS_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// GET - Get hotel mappings for a variant
export async function GET(
  req: Request,
  { params }: { params: { variantId: string } }
) {
  try {
    if (!params.variantId) {
      return new NextResponse("Variant ID is required", { status: 400 });
    }

    const mappings = await prismadb.variantHotelMapping.findMany({
      where: {
        packageVariantId: params.variantId,
      },
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
    });

    return NextResponse.json(mappings);
  } catch (error) {
    console.log('[VARIANT_HOTEL_MAPPINGS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
