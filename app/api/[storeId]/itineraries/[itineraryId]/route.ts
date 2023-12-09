import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";

import prismadb from "@/lib/prismadb";

export async function GET(
  req: Request,
  { params }: { params: { itineraryId: string } }
) {
  try {
    if (!params.itineraryId) {
      return new NextResponse("Itinerary id is required", { status: 400 });
    }

    const itinerary = await prismadb.itinerary.findUnique({
      where: {
        id: params.itineraryId
      }
    });
  
    return NextResponse.json(itinerary);
  } catch (error) {
    console.log('[ITINERARY_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};

export async function DELETE(
  req: Request,
  { params }: { params: { itineraryId: string, storeId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.itineraryId) {
      return new NextResponse("Itinerary id is required", { status: 400 });
    }

    const storeByUserId = await prismadb.store.findFirst({
      where: {
        id: params.storeId,
        userId,
      }
    });

    if (!storeByUserId) {
      return new NextResponse("Unauthorized", { status: 405 });
    }

    const itinerary = await prismadb.itinerary.delete({
      where: {
        id: params.itineraryId,
      }
    });
  
    return NextResponse.json(itinerary);
  } catch (error) {
    console.log('[ITINERARY_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};


export async function PATCH(
  req: Request,
  { params }: { params: { itineraryId: string, storeId: string } }
) {
  try {   
    const { userId } = auth();

    const body = await req.json();
    
    const { label, imageUrl } = body;
    
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!label) {
      return new NextResponse("Label is required", { status: 400 });
    }

    if (!imageUrl) {
      return new NextResponse("Image URL is required", { status: 400 });
    }

    if (!params.itineraryId) {
      return new NextResponse("Itinerary id is required", { status: 400 });
    }

    const storeByUserId = await prismadb.store.findFirst({
      where: {
        id: params.storeId,
        userId,
      }
    });

    if (!storeByUserId) {
      return new NextResponse("Unauthorized", { status: 405 });
    }

    const itinerary = await prismadb.itinerary.update({
      where: {
        id: params.itineraryId,
      },
      data: {
        label,
        imageUrl
      }
    });
  
    return NextResponse.json(itinerary);
  } catch (error) {
    console.log('[ITINERARY_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};
