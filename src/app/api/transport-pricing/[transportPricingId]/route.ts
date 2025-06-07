import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function GET(
  req: Request,
  { params }: { params: { transportPricingId: string } }
) {
  try {
    if (!params.transportPricingId) {
      return new NextResponse("Transport pricing ID is required", { status: 400 });
    }

    const transportPricing = await prismadb.transportPricing.findUnique({
      where: {
        id: params.transportPricingId
      },
      include: {
        location: true,
        vehicleType: true
      }
    });

    return NextResponse.json(transportPricing);
  } catch (error) {
    console.log('[TRANSPORT_PRICING_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { transportPricingId: string } }
) {
  try {
    const { userId } = auth();
    const body = await req.json();
      const { 
      locationId,
      vehicleTypeId,
      price,
      transportType,
      description,
      startDate,
      endDate,
      isActive
    } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    if (!params.transportPricingId) {
      return new NextResponse("Transport pricing ID is required", { status: 400 });
    }    // Create the update data object with all fields that might be updated
    const updateData: any = {};
      if (locationId !== undefined) updateData.locationId = locationId;
    if (vehicleTypeId !== undefined) updateData.vehicleTypeId = vehicleTypeId;
    if (price !== undefined) updateData.price = price;
    if (transportType !== undefined) updateData.transportType = transportType;
    if (description !== undefined) updateData.description = description;
    if (startDate !== undefined) updateData.startDate = new Date(new Date(startDate).toISOString());
    if (endDate !== undefined) updateData.endDate = new Date(new Date(endDate).toISOString());
    if (isActive !== undefined) updateData.isActive = isActive;

    const transportPricing = await prismadb.transportPricing.update({
      where: {
        id: params.transportPricingId
      },
      data: updateData
    });

    return NextResponse.json(transportPricing);
  } catch (error) {
    console.log('[TRANSPORT_PRICING_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { transportPricingId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    if (!params.transportPricingId) {
      return new NextResponse("Transport pricing ID is required", { status: 400 });
    }

    const transportPricing = await prismadb.transportPricing.delete({
      where: {
        id: params.transportPricingId
      }
    });

    return NextResponse.json(transportPricing);
  } catch (error) {
    console.log('[TRANSPORT_PRICING_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}