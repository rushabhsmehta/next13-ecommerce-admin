import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from '@/lib/timezone-utils';

// GET a specific pricing record
export async function GET(
  req: Request,
  props: { params: Promise<{ tourPackageId: string; pricingId: string }> }
) {
  const params = await props.params;
  try {
    if (!params.tourPackageId) {
      return new NextResponse("Tour Package ID is required", { status: 400 });
    }

    if (!params.pricingId) {
      return new NextResponse("Pricing ID is required", { status: 400 });
    }    const pricingPeriod = await prismadb.tourPackagePricing.findUnique({
      where: {
        id: params.pricingId,
        tourPackageId: params.tourPackageId
      },
      include: {
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
        },
      }
    });

    if (!pricingPeriod) {
      return new NextResponse("Pricing period not found", { status: 404 });
    }

    return NextResponse.json(pricingPeriod);
  } catch (error) {
    console.error("[TOUR_PACKAGE_PRICING_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// PATCH to update a specific pricing record
export async function PATCH(
  req: Request,
  props: { params: Promise<{ tourPackageId: string; pricingId:string }> }
) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.tourPackageId) {
      return new NextResponse("Tour Package ID is required", { status: 400 });
    }

    if (!params.pricingId) {
      return new NextResponse("Pricing ID is required", { status: 400 });
    }

    const body = await req.json();
    const { 
      startDate, 
      endDate, 
      mealPlanId,
      numberOfRooms,
      vehicleTypeId,
      locationSeasonalPeriodId,
      isActive,
      description,
      pricingComponents,
      isGroupPricing
    } = body;

    // Handle partial update for isGroupPricing toggle
    if (typeof isGroupPricing === 'boolean' && Object.keys(body).length === 1) {
      const updatedPricing = await prismadb.tourPackagePricing.update({
        where: {
          id: params.pricingId,
          tourPackageId: params.tourPackageId,
        },
        data: {
          isGroupPricing: isGroupPricing,
        },
      });
      return NextResponse.json(updatedPricing);
    }

    if (!startDate || !endDate) {
      return new NextResponse("Start date and end date are required", { status: 400 });
    }

    if (!mealPlanId) {
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
    }

    // First, delete existing pricing components if we're updating them
    if (pricingComponents) {
      await prismadb.pricingComponent.deleteMany({
        where: {
          tourPackagePricingId: params.pricingId
        }
      });
    }

    // Update the pricing record
    const updatedPricing = await prismadb.tourPackagePricing.update({
      where: {
        id: params.pricingId
      },
      data: {
        startDate: dateToUtc(startDate)!,
        endDate: dateToUtc(endDate)!,
        mealPlanId,
        numberOfRooms,
        vehicleTypeId: vehicleTypeId || null,
        locationSeasonalPeriodId: locationSeasonalPeriodId || null,
        isActive: isActive !== undefined ? isActive : true,
        description: description || null,
        isGroupPricing: isGroupPricing || false,
        // Create new pricing components if provided
        pricingComponents: pricingComponents?.length > 0 ? {
          create: pricingComponents.map((component: any) => ({
            pricingAttributeId: component.pricingAttributeId,
            price: parseFloat(component.price || 0),
            purchasePrice: component.purchasePrice ? parseFloat(component.purchasePrice) : null,
            description: component.description || null
          }))
        } : undefined
      },
      include: {
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

    return NextResponse.json(updatedPricing);
  } catch (error) {
    console.error("[TOUR_PACKAGE_PRICING_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// DELETE a specific pricing record
export async function DELETE(
  req: Request,
  props: { params: Promise<{ tourPackageId: string; pricingId: string }> }
) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.tourPackageId) {
      return new NextResponse("Tour Package ID is required", { status: 400 });
    }

    if (!params.pricingId) {
      return new NextResponse("Pricing ID is required", { status: 400 });
    }

    // Verify the pricing record exists and belongs to the specified tour package
    const pricingPeriod = await prismadb.tourPackagePricing.findUnique({
      where: {
        id: params.pricingId,
        tourPackageId: params.tourPackageId
      }
    });

    if (!pricingPeriod) {
      return new NextResponse("Pricing period not found", { status: 404 });
    }

    // Delete the pricing record
    await prismadb.tourPackagePricing.delete({
      where: {
        id: params.pricingId
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[TOUR_PACKAGE_PRICING_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
