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
        images: true,
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
  { params }: { params: { hotelId : string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }



    if (!params.hotelId) {
      return new NextResponse("Hotel id is required", { status: 400 });
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
  { params }: { params: { hotelId : string } }
) {
  try {   
    const { userId } = auth();

    const body = await req.json();
    
    const { name, images, locationId, link } = body; // Added link to destructuring
    
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!locationId) {
      return new NextResponse("Location ID is required", { status: 400 });
    }
    if (!images || !images.length) {
      return new NextResponse("Images are required", { status: 400 });
    }

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    if (!params.hotelId) {
      return new NextResponse("Hotel id is required", { status: 400 });
    }

    await prismadb.hotel.update({
      where: {
        id: params.hotelId,
      },
      data: {
        name,
        locationId,
        link, // Added link to update data
        images: {
          deleteMany: {},
        },
      }
    });

    const hotel = await prismadb.hotel.update({
      where: {
        id: params.hotelId
      },
      data: {
        images: {
          createMany: {
            data: [
              ...images.map((image: { url: string }) => image),
            ],
          },
        },
      }
    });
  
    return NextResponse.json(hotel);
  } catch (error) {
    console.log('[HOTEL_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};
