import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";

import prismadb from "@/lib/prismadb";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const body = await req.json();

    const { name, description, sortOrder, isActive, isDefault } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    // Check if pricing attribute with same name already exists
    const existingAttribute = await prismadb.pricingAttribute.findUnique({
      where: {
        name
      }
    });

    if (existingAttribute) {
      return new NextResponse("A pricing attribute with this name already exists", { status: 400 });
    }

    const pricingAttribute = await prismadb.pricingAttribute.create({
      data: {
        name,
        description: description || null,
        sortOrder: sortOrder || 0,
        isActive: isActive !== undefined ? isActive : true,
        isDefault: isDefault || false
      },
    });

    return NextResponse.json(pricingAttribute);
  } catch (error) {
    console.log('[PRICING_ATTRIBUTES_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const isDefault = searchParams.get("isDefault");
    const isActive = searchParams.get("isActive");

    let whereClause: any = {};
    
    if (isDefault !== null) {
      whereClause.isDefault = isDefault === "true";
    }

    if (isActive !== null) {
      whereClause.isActive = isActive === "true";
    }

    const pricingAttributes = await prismadb.pricingAttribute.findMany({
      where: whereClause,
      orderBy: {
        sortOrder: 'asc'
      }
    });

    return NextResponse.json(pricingAttributes);
  } catch (error) {
    console.log('[PRICING_ATTRIBUTES_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
