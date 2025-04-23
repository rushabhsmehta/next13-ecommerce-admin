import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function GET(
  req: Request,
  { params }: { params: { componentId: string } }
) {
  try {
    if (!params.componentId) {
      return new NextResponse("Component ID is required", { status: 400 });
    }

    // Get a specific pricing component
    const pricingComponent = await prismadb.pricingComponent.findUnique({
      where: {
        id: params.componentId
      }
    });

    if (!pricingComponent) {
      return new NextResponse("Pricing component not found", { status: 404 });
    }

    return NextResponse.json(pricingComponent);
  } catch (error) {
    console.error("[PRICING_COMPONENT_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { componentId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.componentId) {
      return new NextResponse("Component ID is required", { status: 400 });
    }

    const body = await req.json();
    const { name, price, description } = body;

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    // Update the pricing component
    const updatedComponent = await prismadb.pricingComponent.update({
      where: {
        id: params.componentId
      },
      data: {
        name,
        price: price || null,
        description: description || null,
      }
    });

    return NextResponse.json(updatedComponent);
  } catch (error) {
    console.error("[PRICING_COMPONENT_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { componentId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.componentId) {
      return new NextResponse("Component ID is required", { status: 400 });
    }

    // Check if the component is in use
    const usedInPricing = await prismadb.tourPackagePricing.findFirst({
      where: {
        pricingComponents: {
          some: {
            id: params.componentId
          }
        }
      }
    });

    if (usedInPricing) {
      return new NextResponse("Cannot delete a pricing component that is in use", { status: 400 });
    }

    // Delete the pricing component
    const deletedComponent = await prismadb.pricingComponent.delete({
      where: {
        id: params.componentId
      }
    });

    return NextResponse.json(deletedComponent);
  } catch (error) {
    console.error("[PRICING_COMPONENT_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
