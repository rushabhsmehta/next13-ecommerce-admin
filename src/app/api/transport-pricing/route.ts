import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from '@/lib/timezone-utils';

export async function POST(
  req: Request
) {
  try {
    const { userId } = await auth();
    const body = await req.json();    const { 
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

    if (!locationId) {
      return new NextResponse("Location ID is required", { status: 400 });
    }

    if (!vehicleTypeId) {
      return new NextResponse("Vehicle type ID is required", { status: 400 });
    }

    if (!price) {
      return new NextResponse("Price is required", { status: 400 });
    }

    if (!transportType) {
      return new NextResponse("Transport type is required", { status: 400 });
    }

    if (!startDate || !endDate) {
      return new NextResponse("Start and end dates are required", { status: 400 });
    }    const transportPricing = await prismadb.transportPricing.create({
      data: {
        locationId,
        vehicleTypeId,
        price,
        transportType,
        description,
        startDate: dateToUtc(startDate)!,
        endDate: dateToUtc(endDate)!,
        isActive: isActive ?? true
      }
    });

    return NextResponse.json(transportPricing);
  } catch (error) {
    console.log('[TRANSPORT_PRICING_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(
  req: Request
) {
  try {    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("locationId");
    const vehicleTypeId = searchParams.get("vehicleTypeId");
    const transportType = searchParams.get("transportType");
    const isActive = searchParams.get("isActive");    // Parse date parameters if provided
    const dateString = searchParams.get("date");
    let date = dateString ? dateToUtc(dateString) : null;
      // Build the query filter
    let whereClause: any = {};

    if (locationId) {
      whereClause.locationId = locationId;
    }

    if (vehicleTypeId) {
      whereClause.vehicleTypeId = vehicleTypeId;
    }

    if (transportType) {
      whereClause.transportType = transportType;
    }

    if (isActive !== null) {
      whereClause.isActive = isActive === 'true';
    }

    // If date is provided, check if it falls within any pricing period
    if (date) {
      whereClause.AND = [
        { startDate: { lte: date } },
        { endDate: { gte: date } }
      ];
    }

    // Get the transport pricing records
    const transportPricings = await prismadb.transportPricing.findMany({
      where: whereClause,
      include: {
        location: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(transportPricings);
  } catch (error) {
    console.log('[TRANSPORT_PRICING_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}