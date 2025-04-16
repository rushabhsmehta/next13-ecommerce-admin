import { NextResponse } from 'next/server';
import prismadb from '@/lib/prismadb';

export async function GET(
  req: Request,
  { params }: { params: { vehicleTypeId: string } }
) {
  try {
    const vehicleType = await prismadb.vehicleType.findUnique({
      where: {
        id: params.vehicleTypeId
      }
    });
    
    return NextResponse.json(vehicleType);
  } catch (error) {
    console.log('[VEHICLE_TYPE_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { vehicleTypeId: string } }
) {
  try {
    const body = await req.json();
    const { name, description, capacity, isActive } = body;
    
    if (!name && description === undefined && capacity === undefined && isActive === undefined) {
      return new NextResponse("At least one field must be provided for update", { status: 400 });
    }
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (capacity !== undefined) updateData.capacity = parseInt(capacity);
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const vehicleType = await prismadb.vehicleType.update({
      where: {
        id: params.vehicleTypeId
      },
      data: updateData
    });
    
    return NextResponse.json(vehicleType);
  } catch (error) {
    console.log('[VEHICLE_TYPE_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { vehicleTypeId: string } }
) {
  try {
    // Use transaction to batch all database queries into a single connection
    const result = await prismadb.$transaction(async (tx) => {
      // Check if vehicle type is being used
      const transportDetailsCount = await tx.transportDetail.count({
        where: {
          vehicleTypeId: params.vehicleTypeId
        }
      });
      
      const transportPricingsCount = await tx.transportPricing.count({
        where: {
          vehicleTypeId: params.vehicleTypeId
        }
      });
      
      const totalUsageCount = transportDetailsCount + transportPricingsCount;
      
      // Either update or delete based on usage count
      if (totalUsageCount > 0) {
        // Set to inactive instead of deleting
        const vehicleType = await tx.vehicleType.update({
          where: {
            id: params.vehicleTypeId
          },
          data: {
            isActive: false
          }
        });
          return vehicleType;
      }
      
      // If not used, safe to delete
      const vehicleType = await tx.vehicleType.delete({
        where: {
          id: params.vehicleTypeId
        }
      });
      
      return vehicleType;
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.log('[VEHICLE_TYPE_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
