import { NextResponse } from 'next/server';
import prismadb from '@/lib/prismadb';

export async function GET(req: Request, props: { params: Promise<{ roomTypeId: string }> }) {
  const params = await props.params;
  try {
    const roomType = await prismadb.roomType.findUnique({
      where: {
        id: params.roomTypeId
      }
    });
    
    return NextResponse.json(roomType);
  } catch (error) {
    console.log('[ROOM_TYPE_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ roomTypeId: string }> }) {
  const params = await props.params;
  try {
    const body = await req.json();
    const { name, description, isActive } = body;
    
    if (!name && description === undefined && isActive === undefined) {
      return new NextResponse("At least one field must be provided for update", { status: 400 });
    }
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const roomType = await prismadb.roomType.update({
      where: {
        id: params.roomTypeId
      },
      data: updateData
    });
    
    return NextResponse.json(roomType);
  } catch (error) {
    console.log('[ROOM_TYPE_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ roomTypeId: string }> }) {
  const params = await props.params;
  try {
    // Check if room type is being used in any room allocations
    const roomAllocationsCount = await prismadb.roomAllocation.count({
      where: {
        roomTypeId: params.roomTypeId
      }
    });
    
    // Check if room type is being used in any hotel pricings
    const hotelPricingsCount = await prismadb.hotelPricing.count({
      where: {
        roomTypeId: params.roomTypeId
      }
    });
    
    // Check if room type is being used in any itineraries
    const itinerariesCount = await prismadb.itinerary.count({
      where: {
        roomTypeId: params.roomTypeId
      }
    });
    
    const totalUsageCount = roomAllocationsCount + hotelPricingsCount + itinerariesCount;
    
    if (totalUsageCount > 0) {
      // Set to inactive instead of deleting if in use
      const roomType = await prismadb.roomType.update({
        where: {
          id: params.roomTypeId
        },
        data: {
          isActive: false
        }
      });
      
      return NextResponse.json(roomType);
    }
    
    // If not used, safe to delete
    const roomType = await prismadb.roomType.delete({
      where: {
        id: params.roomTypeId
      }
    });
    
    return NextResponse.json(roomType);
  } catch (error) {
    console.log('[ROOM_TYPE_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
