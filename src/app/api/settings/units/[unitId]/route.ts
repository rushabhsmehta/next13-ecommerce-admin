import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

export async function GET(req: Request, props: { params: Promise<{ unitId: string }> }) {
  const params = await props.params;
  try {
    if (!params.unitId) {
      return new NextResponse("Unit ID is required", { status: 400 });
    }

    const unit = await prismadb.unitOfMeasure.findUnique({
      where: {
        id: params.unitId,
      }
    });
  
    return NextResponse.json(unit);
  } catch (error) {
    console.log('[UNIT_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ unitId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    const body = await req.json();

    const { name, abbreviation, description, isActive } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.unitId) {
      return new NextResponse("Unit ID is required", { status: 400 });
    }

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    if (!abbreviation) {
      return new NextResponse("Abbreviation is required", { status: 400 });
    }

    const unit = await prismadb.unitOfMeasure.update({
      where: {
        id: params.unitId,
      },
      data: {
        name,
        abbreviation,
        description,
        isActive,
      }
    });
  
    return NextResponse.json(unit);
  } catch (error) {
    console.log('[UNIT_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ unitId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.unitId) {
      return new NextResponse("Unit ID is required", { status: 400 });
    }

    // Check if the unit is in use before deleting
    const purchaseItems = await prismadb.purchaseItem.findFirst({
      where: {
        unitOfMeasureId: params.unitId,
      },
    });

    if (purchaseItems) {
      return new NextResponse(
        "Cannot delete unit as it's being used in purchases.",
        { status: 400 }
      );
    }

    const saleItems = await prismadb.saleItem.findFirst({
      where: {
        unitOfMeasureId: params.unitId,
      },
    });

    if (saleItems) {
      return new NextResponse(
        "Cannot delete unit as it's being used in sales.",
        { status: 400 }
      );
    }

    const unit = await prismadb.unitOfMeasure.delete({
      where: {
        id: params.unitId,
      }
    });
  
    return NextResponse.json(unit);
  } catch (error) {
    console.log('[UNIT_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
