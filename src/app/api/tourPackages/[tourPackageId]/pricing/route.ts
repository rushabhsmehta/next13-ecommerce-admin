import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

// GET tour package pricing for a specific tourPackageId
export async function GET(
  req: Request,
  { params }: { params: { tourPackageId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.tourPackageId) {
      return new NextResponse("Tour Package ID is required", { status: 400 });
    }

    // Get query parameters for date filtering
    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");    // Build the filter based on available parameters
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        AND: [
          { startDate: { lte: new Date(new Date(endDate).toISOString()) } },
          { endDate: { gte: new Date(new Date(startDate).toISOString()) } }
        ]
      };
    }

    const tourPackagePricing = await prismadb.tourPackagePricing.findMany({
      where: {
        tourPackageId: params.tourPackageId,
        isActive: true,
        ...dateFilter
      },      include: {
        mealPlan: true,
        pricingComponents: {
          include: {
            pricingAttribute: true
          }
        },
      },
      orderBy: {
        startDate: 'asc'
      }
    });

    return NextResponse.json(tourPackagePricing);
  } catch (error) {
    console.error("[TOUR_PACKAGE_PRICING_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// POST to create new tour package pricing
export async function POST(
  req: Request,
  { params }: { params: { tourPackageId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.tourPackageId) {
      return new NextResponse("Tour Package ID is required", { status: 400 });
    }    const body = await req.json();
    const { 
      startDate, 
      endDate, 
      mealPlanId, 
      numberOfRooms,
      description,
      pricingComponents
    } = body;

    if (!startDate || !endDate) {
      return new NextResponse("Start date and end date are required", { status: 400 });
    }    if (!mealPlanId) {
      return new NextResponse("Meal plan is required", { status: 400 });
    }

    if (typeof numberOfRooms !== "number" || numberOfRooms < 1) {
      return new NextResponse("Valid number of rooms is required", { status: 400 });
    }

    // Check if the tour package exists
    const tourPackage = await prismadb.tourPackage.findUnique({
      where: {
        id: params.tourPackageId
      }
    });

    if (!tourPackage) {
      return new NextResponse("Tour Package not found", { status: 404 });
    }    // Create the tour package pricing record
    const tourPackagePricing = await prismadb.tourPackagePricing.create({
      data: {
        tourPackageId: params.tourPackageId,
        startDate: new Date(new Date(startDate).toISOString()),
        endDate: new Date(new Date(endDate).toISOString()),
        mealPlanId,
        numberOfRooms,
        description: description || null,
        isActive: true,
        // Add pricing components if provided
        pricingComponents: pricingComponents?.length > 0 ? {
          create: pricingComponents.map((component: any) => ({
            pricingAttributeId: component.pricingAttributeId,
            price: parseFloat(component.price || 0)
          }))
        } : undefined
      },
      include: {
        pricingComponents: true
      }
    });

    return NextResponse.json(tourPackagePricing);
  } catch (error) {
    console.error("[TOUR_PACKAGE_PRICING_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
