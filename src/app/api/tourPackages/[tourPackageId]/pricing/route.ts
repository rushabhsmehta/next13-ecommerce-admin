import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from '@/lib/timezone-utils';

// GET tour package pricing for a specific tourPackageId
export async function GET(req: Request, props: { params: Promise<{ tourPackageId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.tourPackageId) {
      return new NextResponse("Tour Package ID is required", { status: 400 });
    }

    // Get query parameters for date filtering
    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const packageVariantId = url.searchParams.get("packageVariantId");
    const includeGlobal = url.searchParams.get("includeGlobal") !== "false";
    const onlyGlobal = url.searchParams.get("onlyGlobal") === "true";

    // Build the filter based on available parameters
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        AND: [
          { startDate: { lte: dateToUtc(endDate)! } },
          { endDate: { gte: dateToUtc(startDate)! } }
        ]
      };
    }

    const whereClause: any = {
      tourPackageId: params.tourPackageId,
      isActive: true,
      ...dateFilter,
    };

    if (onlyGlobal) {
      whereClause.packageVariantId = null;
    } else if (packageVariantId) {
      if (includeGlobal) {
        whereClause.OR = [
          { packageVariantId },
          { packageVariantId: null },
        ];
      } else {
        whereClause.packageVariantId = packageVariantId;
      }
    }

    const tourPackagePricing = await prismadb.tourPackagePricing.findMany({
      where: whereClause,
      include: {
        mealPlan: true,        
        locationSeasonalPeriod: true,
        vehicleType: true,
        pricingComponents: {
          include: {
            pricingAttribute: true
          },
          orderBy: {
            pricingAttribute: {
              sortOrder: 'asc'
            }
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
export async function POST(req: Request, props: { params: Promise<{ tourPackageId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();
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
      vehicleTypeId,
      locationSeasonalPeriodId,
      description,
      pricingComponents,
      isGroupPricing
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
        startDate: dateToUtc(startDate)!,
        endDate: dateToUtc(endDate)!,
        mealPlanId,
        numberOfRooms,
        vehicleTypeId: vehicleTypeId || null,
        locationSeasonalPeriodId: locationSeasonalPeriodId || null,
        description: description || null,
        isGroupPricing: isGroupPricing || false,
        isActive: true,
        // Add pricing components if provided
        pricingComponents: pricingComponents?.length > 0 ? {
          create: pricingComponents.map((component: any) => ({
            pricingAttributeId: component.pricingAttributeId,
            price: parseFloat(component.price || 0),
            purchasePrice: component.purchasePrice ? parseFloat(component.purchasePrice) : null,
            description: component.description || null
          }))
        } : undefined
      },      include: {
        mealPlan: true,
        vehicleType: true,
        locationSeasonalPeriod: true,
        pricingComponents: {
          include: {
            pricingAttribute: true
          },
          orderBy: {
            pricingAttribute: {
              sortOrder: 'asc'
            }
          }
        }
      }
    });

    return NextResponse.json(tourPackagePricing);
  } catch (error) {
    console.error("[TOUR_PACKAGE_PRICING_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
