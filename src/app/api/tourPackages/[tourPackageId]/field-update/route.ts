import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function PATCH(
  req: Request,
  { params }: { params: { tourPackageId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.tourPackageId) {
      return new NextResponse("Tour Package ID is required", { status: 400 });
    }

    const body = await req.json();
    const { field, value } = body;

    if (!field || value === undefined) {
      return new NextResponse("Field and value are required", { status: 400 });
    }

    // Define allowed fields for security
    const allowedFields = ['tourPackageType', 'tourCategory', 'numDaysNight'];
    
    if (!allowedFields.includes(field)) {
      return new NextResponse("Field not allowed for update", { status: 400 });
    }

    // Create update data object
    const updateData: any = {};
    updateData[field] = value;

    const tourPackage = await prismadb.tourPackage.update({
      where: {
        id: params.tourPackageId
      },
      data: updateData,
      select: {
        id: true,
        updatedAt: true,
        [field]: true
      }
    });

    return NextResponse.json({
      success: true,
      updatedAt: tourPackage.updatedAt,
      field,
      value: tourPackage[field]
    });
  } catch (error) {
    console.log('[TOUR_PACKAGE_FIELD_UPDATE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
