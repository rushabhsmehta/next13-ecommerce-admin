import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";

import prismadb from "@/lib/prismadb";

export async function GET(
  req: Request,
  { params }: { params: { locationId: string } }
) {
  try {
    if (!params.locationId) {
      return new NextResponse("Location id is required", { status: 400 });
    }

    const location = await prismadb.location.findUnique({
      where: {
        id: params.locationId
      }
    });
  
    return NextResponse.json(location);
  } catch (error) {
    console.log('[LOCATION_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};

export async function DELETE(
  req: Request,
  { params }: { params: { locationId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.locationId) {
      return new NextResponse("Location id is required", { status: 400 });
    }

   

    

    const location = await prismadb.location.delete({
      where: {
        id: params.locationId,
      }
    });
  
    return NextResponse.json(location);
  } catch (error) {
    console.log('[LOCATION_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};


export async function PATCH(
  req: Request,
  { params }: { params: { locationId: string } }
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

    if (!params.locationId) {
      return new NextResponse("Location id is required", { status: 400 });
    }

   

    

    const location = await prismadb.location.update({
      where: {
        id: params.locationId,
      },
      data: {
        label,
        imageUrl,
        tags, // Add the 'tags' property here
        slug
      }
    });
  
    return NextResponse.json(location);
  } catch (error) {
    console.log('[LOCATION_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};
