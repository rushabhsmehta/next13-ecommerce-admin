import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import prismadb from "@/lib/prismadb";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    const body = await req.json();
    const { name, description, imageUrl, locationId } = body;

    // Validation
    if (!name) return new NextResponse("Name is required", { status: 400 });
    if (!locationId) return new NextResponse("Location ID is required", { status: 400 });

    // Check if location exists
    const location = await prismadb.location.findUnique({
      where: { id: locationId }
    });

    if (!location) {
      return new NextResponse("Location not found", { status: 404 });
    }

    // Create new destination entry
    const destination = await prismadb.tourDestination.create({
      data: {
        name,
        description,
        imageUrl,
        locationId,
      },
      include: {
        location: true,
      },
    });

    return NextResponse.json(destination);
  } catch (error) {
    console.log("[DESTINATIONS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("locationId");

    let whereClause = {};
    if (locationId) {
      whereClause = { locationId };
    }

    // Fetch destinations with location data
    const destinations = await prismadb.tourDestination.findMany({
      where: whereClause,
      include: {
        location: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(destinations);
  } catch (error) {
    console.log("[DESTINATIONS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
