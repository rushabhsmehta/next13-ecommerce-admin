import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prismadb from '@/lib/prismadb';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    const body = await req.json();

    const { name, percentage, description, isActive } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    if (percentage === undefined || percentage < 0) {
      return new NextResponse("Valid percentage is required", { status: 400 });
    }

    const taxSlab = await prismadb.taxSlab.create({
      data: {
        name,
        percentage,
        description,
        isActive,
      }
    });
  
    return NextResponse.json(taxSlab);
  } catch (error) {
    console.log('[TAX_SLABS_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const taxSlabs = await prismadb.taxSlab.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  
    return NextResponse.json(taxSlabs);
  } catch (error) {
    console.log('[TAX_SLABS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

