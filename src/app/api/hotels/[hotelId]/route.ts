import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import prismadb from "@/lib/prismadb";

export async function GET(req: Request, props: { params: Promise<{ hotelId: string }> }) {
  const params = await props.params;
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
        location: true,
        destination: true
      }
    });
  
    return NextResponse.json(hotel);
  } catch (error) {
    console.log('[HOTEL_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};

export async function DELETE(req: Request, props: { params: Promise<{ hotelId : string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();

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


export async function PATCH(req: Request, props: { params: Promise<{ hotelId : string }> }) {
  const params = await props.params;
  try {   
    const { userId } = await auth();

    const body = await req.json();
    
    const { name, images, locationId, destinationId, link } = body;
    
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
        destinationId,
        link,
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
