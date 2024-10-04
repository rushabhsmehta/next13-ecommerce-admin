import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";

import prismadb from "@/lib/prismadb";

export async function GET(
  req: Request,
  { params }: { params: { slug : string } }
) {
  try {
    if (!params.slug) {
      return new NextResponse("Location Slug is required", { status: 400 });
    }

    const location = await prismadb.location.findFirst({
      where: {
        slug : params.slug
      }
    });
  
    return NextResponse.json(location);
  } catch (error) {
    console.log('[LOCATION_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};
