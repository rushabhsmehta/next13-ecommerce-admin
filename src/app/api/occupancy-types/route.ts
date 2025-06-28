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
        rank: 'asc'
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
    const { name, description, maxPersons, rank } = body;
    
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!name || maxPersons === undefined) {
      return new NextResponse("Name and maxPersons are required", { status: 400 });
    }
    
    // Validate rank uniqueness if provided
    if (rank !== undefined) {
      const existingWithRank = await prismadb.occupancyType.findFirst({
        where: {
          rank: parseInt(rank),
          isActive: true
        }
      });
      
      if (existingWithRank) {
        return new NextResponse("Another active occupancy type already has this rank", { status: 400 });
      }
    }
    
    const occupancyType = await prismadb.occupancyType.create({
      data: {
        name,
        description,
        maxPersons: parseInt(maxPersons) || 1,
        rank: rank !== undefined ? parseInt(rank) : 1
      }
    });
    
    return NextResponse.json(occupancyType);
  } catch (error) {
    console.log('[OCCUPANCY_TYPES_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = auth();
    const body = await req.json();
    const { updates } = body; // Array of { id, rank } objects
    
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!Array.isArray(updates)) {
      return new NextResponse("Updates array is required", { status: 400 });
    }
    
    // Update all ranks in a transaction
    const updatePromises = updates.map(({ id, rank }: { id: string, rank: number }) =>
      prismadb.occupancyType.update({
        where: { id },
        data: { rank: parseInt(rank.toString()) }
      })
    );
    
    await Promise.all(updatePromises);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.log('[OCCUPANCY_TYPES_BULK_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
