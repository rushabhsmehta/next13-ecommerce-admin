import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function GET(
  req: Request,
  { params }: { params: { pricingComponentId: string } }
) {
  try {
    if (!params.pricingComponentId) {
      return new NextResponse("Pricing component ID is required", { status: 400 });
    }

    const pricingComponent = await prismadb.pricingComponent.findUnique({
      where: {
        id: params.pricingComponentId
      },
      include: {
        pricingAttribute: true
      }
    });

    return NextResponse.json(pricingComponent);
  } catch (error) {
    console.log('[PRICING_COMPONENT_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { pricingComponentId: string } }
) {
  try {
    const { userId } = auth();
    const body = await req.json();

    const { pricingAttributeId, price, purchasePrice, description } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    if (!params.pricingComponentId) {
      return new NextResponse("Pricing component ID is required", { status: 400 });
    }

    if (pricingAttributeId) {
      // Verify the pricing attribute exists
      const pricingAttributeExists = await prismadb.pricingAttribute.findUnique({
        where: {
          id: pricingAttributeId
        }
      });

      if (!pricingAttributeExists) {
        return new NextResponse("Pricing attribute not found", { status: 404 });
      }
    }

    const pricingComponent = await prismadb.pricingComponent.update({
      where: {
        id: params.pricingComponentId
      },
      data: {
        pricingAttributeId,
        price,
        purchasePrice: purchasePrice || null,
        description: description || null
      },
      include: {
        pricingAttribute: true
      }
    });

    return NextResponse.json(pricingComponent);
  } catch (error) {
    console.log('[PRICING_COMPONENT_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { pricingComponentId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    if (!params.pricingComponentId) {
      return new NextResponse("Pricing component ID is required", { status: 400 });
    }

    const pricingComponent = await prismadb.pricingComponent.delete({
      where: {
        id: params.pricingComponentId
      }
    });

    return NextResponse.json(pricingComponent);
  } catch (error) {
    console.log('[PRICING_COMPONENT_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
