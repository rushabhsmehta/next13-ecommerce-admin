import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const body = await req.json();

    const { name, abbreviation, description, isActive } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    if (!abbreviation) {
      return new NextResponse("Abbreviation is required", { status: 400 });
    }

    const unit = await prismadb.unitOfMeasure.create({
      data: {
        name,
        abbreviation,
        description,
        isActive,
      }
    });
  
    return NextResponse.json(unit);
  } catch (error) {
    console.log('[UNITS_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const units = await prismadb.unitOfMeasure.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  
    return NextResponse.json(units);
  } catch (error) {
    console.log('[UNITS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

