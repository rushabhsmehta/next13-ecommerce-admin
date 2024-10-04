import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

import prismadb from '@/lib/prismadb';
 
export async function POST(
  req: Request,
) {
  try {
    const { userId } = auth();

    const body = await req.json();

    const { label, imageUrl, tags, slug } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!label) {
      return new NextResponse("Label is required", { status: 400 });
    }

    if (!imageUrl) {
      return new NextResponse("Image URL is required", { status: 400 });
    }

  
   

    

    const location = await prismadb.location.create({
      data: {
        label,
        imageUrl,
        tags,
        slug,
      }
    });
  
    return NextResponse.json(location);
  } catch (error) {
    console.log('[LOCATIONS_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};

export async function GET(
  req: Request,
) {
  try {
  
    const locations = await prismadb.location.findMany({
      where: {
        storeId: params.storeId
      }
    });
  
    return NextResponse.json(locations);
  } catch (error) {
    console.log('[LOCATIONS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};
