import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import prismadb from "@/lib/prismadb";

export async function GET(req: Request, props: { params: Promise<{ pricingAttributeId: string }> }) {
  const params = await props.params;
  try {
    if (!params.pricingAttributeId) {
      return new NextResponse("Pricing attribute ID is required", { status: 400 });
    }

    const pricingAttribute = await prismadb.pricingAttribute.findUnique({
      where: {
        id: params.pricingAttributeId
      }
    });

    return NextResponse.json(pricingAttribute);
  } catch (error) {
    console.log('[PRICING_ATTRIBUTE_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ pricingAttributeId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    const body = await req.json();

    const { name, description, sortOrder, isActive, isDefault } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    if (!params.pricingAttributeId) {
      return new NextResponse("Pricing attribute ID is required", { status: 400 });
    }

    // If name is being updated, check if it's unique
    if (name) {
      const existingAttribute = await prismadb.pricingAttribute.findFirst({
        where: {
          name,
          id: {
            not: params.pricingAttributeId
          }
        }
      });

      if (existingAttribute) {
        return new NextResponse("A pricing attribute with this name already exists", { status: 400 });
      }
    }

    const pricingAttribute = await prismadb.pricingAttribute.update({
      where: {
        id: params.pricingAttributeId
      },
      data: {
        name,
        description,
        sortOrder,
        isActive,
        isDefault
      },
    });

    return NextResponse.json(pricingAttribute);
  } catch (error) {
    console.log('[PRICING_ATTRIBUTE_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ pricingAttributeId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    if (!params.pricingAttributeId) {
      return new NextResponse("Pricing attribute ID is required", { status: 400 });
    }

    // Check if pricing attribute is in use by any pricing components
    const associatedComponents = await prismadb.pricingComponent.count({
      where: {
        pricingAttributeId: params.pricingAttributeId
      }
    });

    if (associatedComponents > 0) {
      return new NextResponse(
        "This pricing attribute is in use by pricing components and cannot be deleted. You can deactivate it instead.",
        { status: 400 }
      );
    }

    const pricingAttribute = await prismadb.pricingAttribute.delete({
      where: {
        id: params.pricingAttributeId
      }
    });

    return NextResponse.json(pricingAttribute);
  } catch (error) {
    console.log('[PRICING_ATTRIBUTE_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
