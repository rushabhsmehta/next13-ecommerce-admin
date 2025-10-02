import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

// GET a specific variant
export async function GET(
  req: Request,
  { params }: { params: { variantId: string } }
) {
  try {
    if (!params.variantId) {
      return new NextResponse("Variant ID is required", { status: 400 });
    }

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

    if (!variant) {
      return new NextResponse("Variant not found", { status: 404 });
    }

    return NextResponse.json(variant);
  } catch (error) {
    console.log('[PACKAGE_VARIANT_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// PATCH - Update a variant
export async function PATCH(
  req: Request,
  { params }: { params: { variantId: string } }
) {
  try {
    const body = await req.json();
    const { name, description, isDefault, sortOrder, priceModifier } = body;

    if (!params.variantId) {
      return new NextResponse("Variant ID is required", { status: 400 });
    }

    const variant = await prismadb.packageVariant.update({
      where: {
        id: params.variantId,
      },
      data: {
        name,
        description,
        isDefault,
        sortOrder,
        priceModifier,
      },
    });

    return NextResponse.json(variant);
  } catch (error) {
    console.log('[PACKAGE_VARIANT_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// DELETE a variant
export async function DELETE(
  req: Request,
  { params }: { params: { variantId: string } }
) {
  try {
    if (!params.variantId) {
      return new NextResponse("Variant ID is required", { status: 400 });
    }

    // Delete variant (cascade will handle hotel mappings)
    await prismadb.packageVariant.delete({
      where: {
        id: params.variantId,
      },
    });

    return NextResponse.json({ message: "Variant deleted successfully" });
  } catch (error) {
    console.log('[PACKAGE_VARIANT_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
