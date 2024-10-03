import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";

import prismadb from "@/lib/prismadb";

export async function GET(
  req: Request,
  { params }: { params: { tags : string } }
) {
  try {
    if (!params.tags) {
      return new NextResponse("Location Tag is required", { status: 400 });
    }

    const location = await prismadb.location.findUnique({
      where: {
        tags : params.tags
      }
    });
  
    return NextResponse.json(location);
  } catch (error) {
    console.log('[LOCATION_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};
