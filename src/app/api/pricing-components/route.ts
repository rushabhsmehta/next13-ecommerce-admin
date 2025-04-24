import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function GET(
  req: Request
) {
  try {
    // Get all pricing components with their related pricing attributes
    const pricingComponents = await prismadb.pricingComponent.findMany({
      include: {
        pricingAttribute: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(pricingComponents);
  } catch (error) {
    console.error("[PRICING_COMPONENTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(
  req: Request
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    const body = await req.json();
    const { pricingAttributeId, price, description, tourPackagePricingId } = body;

    if (!pricingAttributeId) {
      return new NextResponse("Pricing attribute is required", { status: 400 });
    }

    if (price === undefined || price === null) {
      return new NextResponse("Price is required", { status: 400 });
    }

    // Verify the pricing attribute exists
    const pricingAttributeExists = await prismadb.pricingAttribute.findUnique({
      where: {
        id: pricingAttributeId
      }
    });

    if (!pricingAttributeExists) {
      return new NextResponse("Pricing attribute not found", { status: 404 });
    }

    // Create a new pricing component
    const pricingComponent = await prismadb.pricingComponent.create({
      data: {
        pricingAttributeId,
        price: price,
        description: description || null,
        tourPackagePricingId: tourPackagePricingId || null,
      },
      include: {
        pricingAttribute: true
      }
    });

    return NextResponse.json(pricingComponent);
  } catch (error) {
    console.error("[PRICING_COMPONENTS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
