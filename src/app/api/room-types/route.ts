import { NextResponse } from 'next/server';
import prismadb from '@/lib/prismadb';

export async function GET() {
  try {
    const roomTypes = await prismadb.roomType.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    return NextResponse.json(roomTypes);
  } catch (error) {
    console.log('[ROOM_TYPES_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description } = body;
    
    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }
    
    const roomType = await prismadb.roomType.create({
      data: {
        name,
        description
      }
    });
    
    return NextResponse.json(roomType);
  } catch (error) {
    console.log('[ROOM_TYPES_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
