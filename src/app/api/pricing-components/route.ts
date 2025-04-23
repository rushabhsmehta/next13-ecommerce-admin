import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function GET(
  req: Request
) {
  try {
    // Get all pricing components
    const pricingComponents = await prismadb.pricingComponent.findMany({
      orderBy: {
        name: 'asc'
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
    const { name, price, description } = body;

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    // Create a new pricing component
    const pricingComponent = await prismadb.pricingComponent.create({
      data: {
        name,
        price: price || null,
        description: description || null,
      }
    });

    return NextResponse.json(pricingComponent);
  } catch (error) {
    console.error("[PRICING_COMPONENTS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
