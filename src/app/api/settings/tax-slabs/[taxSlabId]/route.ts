import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

export async function GET(req: Request, props: { params: Promise<{ taxSlabId: string }> }) {
  const params = await props.params;
  try {
    if (!params.taxSlabId) {
      return new NextResponse("Tax Slab ID is required", { status: 400 });
    }

    const taxSlab = await prismadb.taxSlab.findUnique({
      where: {
        id: params.taxSlabId,
      }
    });
  
    return NextResponse.json(taxSlab);
  } catch (error) {
    console.log('[TAX_SLAB_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ taxSlabId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    const body = await req.json();

    const { name, percentage, description, isActive } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.taxSlabId) {
      return new NextResponse("Tax Slab ID is required", { status: 400 });
    }

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    if (percentage === undefined || percentage < 0) {
      return new NextResponse("Valid percentage is required", { status: 400 });
    }

    const taxSlab = await prismadb.taxSlab.update({
      where: {
        id: params.taxSlabId,
      },
      data: {
        name,
        percentage,
        description,
        isActive,
      }
    });
  
    return NextResponse.json(taxSlab);
  } catch (error) {
    console.log('[TAX_SLAB_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ taxSlabId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.taxSlabId) {
      return new NextResponse("Tax Slab ID is required", { status: 400 });
    }

    // Check if the tax slab is in use
    const purchaseItems = await prismadb.purchaseItem.findFirst({
      where: {
        taxSlabId: params.taxSlabId,
      },
    });

    if (purchaseItems) {
      return new NextResponse(
        "Cannot delete tax slab as it's being used in purchases.",
        { status: 400 }
      );
    }

    const saleItems = await prismadb.saleItem.findFirst({
      where: {
        taxSlabId: params.taxSlabId,
      },
    });

    if (saleItems) {
      return new NextResponse(
        "Cannot delete tax slab as it's being used in sales.",
        { status: 400 }
      );
    }

    const taxSlab = await prismadb.taxSlab.delete({
      where: {
        id: params.taxSlabId,
      }
    });
  
    return NextResponse.json(taxSlab);
  } catch (error) {
    console.log('[TAX_SLAB_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
