import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";

import prismadb from "@/lib/prismadb";

export async function GET(
  req: Request,
  { params }: { params: { searchTerm: string } }
) {
  try {
    if (!params.searchTerm) {
      return new NextResponse("Search Term is required", { status: 400 });
    }

    const searchTerm = params.searchTerm.toLowerCase();

    const locations = await prismadb.location.findMany({
      where: {
        tags: {
          contains: searchTerm,
        },
      },
    });

    const response = NextResponse.json(locations);
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
  } catch (error) {
    console.log('[LOCATION_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};