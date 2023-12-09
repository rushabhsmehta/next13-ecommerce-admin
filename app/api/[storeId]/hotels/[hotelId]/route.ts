import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";

import prismadb from "@/lib/prismadb";

export async function GET(
  req: Request,
  { params }: { params: { hotelId: string } }
) {
  try {
    if (!params.hotelId) {
      return new NextResponse("Hotel id is required", { status: 400 });
    }

    const hotel = await prismadb.hotel.findUnique({
      where: {
        id: params.hotelId
      },
      include: {
        location : true
      }
    });
  
    return NextResponse.json(hotel);
  } catch (error) {
    console.log('[HOTEL_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};

export async function DELETE(
  req: Request,
  { params }: { params: { hotelId : string, storeId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.hotelId) {
      return new NextResponse("Hotel id is required", { status: 400 });
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

    const hotel = await prismadb.hotel.delete({
      where: {
        id: params.hotelId,
      }
    });
  
    return NextResponse.json(hotel);
  } catch (error) {
    console.log('[HOTEL_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};


export async function PATCH(
  req: Request,
  { params }: { params: { hotelId : string, storeId: string } }
) {
  try {   
    const { userId } = auth();

    const body = await req.json();
    
    const { name, locationId } = body;
    
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!locationId) {
      return new NextResponse("Location ID is required", { status: 400 });
    }

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    if (!params.hotelId) {
      return new NextResponse("Hotel id is required", { status: 400 });
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

    const hotel = await prismadb.hotel.update({
      where: {
        id: params.hotelId,
      },
      data: {
        name,
        locationId
      }
    });
  
    return NextResponse.json(hotel);
  } catch (error) {
    console.log('[HOTEL_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};
