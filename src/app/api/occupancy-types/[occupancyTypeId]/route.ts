import { NextResponse } from 'next/server';
import prismadb from '@/lib/prismadb';

export async function GET(
  req: Request,
  { params }: { params: { occupancyTypeId: string } }
) {
  try {
    const occupancyType = await prismadb.occupancyType.findUnique({
      where: {
        id: params.occupancyTypeId
      }
    });
    
    return NextResponse.json(occupancyType);
  } catch (error) {
    console.log('[OCCUPANCY_TYPE_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { occupancyTypeId: string } }
) {
  try {
    const body = await req.json();
    const { name, description, maxPersons, rank, isActive } = body;
    
    if (!name && description === undefined && maxPersons === undefined && rank === undefined && isActive === undefined) {
      return new NextResponse("At least one field must be provided for update", { status: 400 });
    }
    
    // Validate rank uniqueness if provided
    if (rank !== undefined) {
      const existingWithRank = await prismadb.occupancyType.findFirst({
        where: {
          rank: parseInt(rank),
          id: { not: params.occupancyTypeId },
          isActive: true
        }
      });
      
      if (existingWithRank) {
        return new NextResponse("Another active occupancy type already has this rank", { status: 400 });
      }
    }
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (maxPersons !== undefined) updateData.maxPersons = parseInt(maxPersons);
    if (rank !== undefined) updateData.rank = parseInt(rank);
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const occupancyType = await prismadb.occupancyType.update({
      where: {
        id: params.occupancyTypeId
      },
      data: updateData
    });
    
    return NextResponse.json(occupancyType);
  } catch (error) {
    console.log('[OCCUPANCY_TYPE_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { occupancyTypeId: string } }
) {
  try {
    // Check if occupancy type is being used
    const roomAllocationsCount = await prismadb.roomAllocation.count({
      where: {
        occupancyTypeId: params.occupancyTypeId
      }
    });
    
    const hotelPricingsCount = await prismadb.hotelPricing.count({
      where: {
        occupancyTypeId: params.occupancyTypeId
      }
    });
    
    const itinerariesCount = await prismadb.itinerary.count({
      where: {
        occupancyTypeId: params.occupancyTypeId
      }
    });
    
    const totalUsageCount = roomAllocationsCount + hotelPricingsCount + itinerariesCount;
    
    if (totalUsageCount > 0) {
      // Set to inactive instead of deleting
      const occupancyType = await prismadb.occupancyType.update({
        where: {
          id: params.occupancyTypeId
        },
        data: {
          isActive: false
        }
      });
      
      return NextResponse.json(occupancyType);
    }
    
    // If not used, safe to delete
    const occupancyType = await prismadb.occupancyType.delete({
      where: {
        id: params.occupancyTypeId
      }
    });
    
    return NextResponse.json(occupancyType);
  } catch (error) {
    console.log('[OCCUPANCY_TYPE_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
