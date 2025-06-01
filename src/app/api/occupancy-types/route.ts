import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';

export async function GET() {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    const occupancyTypes = await prismadb.occupancyType.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    return NextResponse.json(occupancyTypes);
  } catch (error) {
    console.log('[OCCUPANCY_TYPES_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const body = await req.json();
    const { name, description, maxPersons } = body;
    
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!name || maxPersons === undefined) {
      return new NextResponse("Name and maxPersons are required", { status: 400 });
    }
    
    const occupancyType = await prismadb.occupancyType.create({
      data: {
        name,
        description,
        maxPersons: parseInt(maxPersons) || 1
      }
    });
    
    return NextResponse.json(occupancyType);
  } catch (error) {
    console.log('[OCCUPANCY_TYPES_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
