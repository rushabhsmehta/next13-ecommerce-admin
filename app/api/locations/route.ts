import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";

import prismadb from "@/lib/prismadb";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    const body = await req.json();
    const {
      label,
      imageUrl,
      tags,
      slug,
      inclusions,
      exclusions,
      importantNotes,
      paymentPolicy,
      usefulTip,
      cancellationPolicy,
      airlineCancellationPolicy,
      termsconditions,
    } = body;

    // Validation
    if (!label) return new NextResponse("Label is required", { status: 400 });
    if (!imageUrl) return new NextResponse("Image URL is required", { status: 400 });

    // Create new location entry
    const location = await prismadb.location.create({
      data: {
        label,
        imageUrl,
        tags,
        slug,
        inclusions,
        exclusions,
        importantNotes,
        paymentPolicy,
        usefulTip,
        cancellationPolicy,
        airlineCancellationPolicy,
        termsconditions,
      },
    });

    return NextResponse.json(location);
  } catch (error) {
    console.log("[LOCATIONS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    // Fetch all locations with all fields
    const locations = await prismadb.location.findMany({
      select: {
        id: true,
        label: true,
        imageUrl: true,
        tags: true,
        slug: true,
        inclusions: true,
        exclusions: true,
        importantNotes: true,
        paymentPolicy: true,
        usefulTip: true,
        cancellationPolicy: true,
        airlineCancellationPolicy: true,
        termsconditions: true,
      },
    });

    return NextResponse.json(locations);
  } catch (error) {
    console.log("[LOCATIONS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
