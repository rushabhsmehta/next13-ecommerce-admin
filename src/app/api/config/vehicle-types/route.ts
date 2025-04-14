import { NextResponse } from 'next/server';
import prismadb from '@/lib/prismadb';

export async function GET() {
  try {
    const vehicleTypes = await prismadb.vehicleType.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    return NextResponse.json(vehicleTypes);
  } catch (error) {
    console.log('[VEHICLE_TYPES_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description, capacity } = body;
    
    if (!name) {
      return new NextResponse("Vehicle type name is required", { status: 400 });
    }
    
    const vehicleType = await prismadb.vehicleType.create({
      data: {
        name,
        description,
        capacity: parseInt(capacity) || 0
      }
    });
    
    return NextResponse.json(vehicleType);
  } catch (error) {
    console.log('[VEHICLE_TYPES_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
