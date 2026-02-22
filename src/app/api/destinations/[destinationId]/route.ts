import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

export async function GET(req: Request, props: { params: Promise<{ destinationId: string }> }) {
  const params = await props.params;
  try {
    if (!params.destinationId) {
      return new NextResponse("Destination ID is required", { status: 400 });
    }

    const destination = await prismadb.tourDestination.findUnique({
      where: {
        id: params.destinationId,
      },
      include: {
        location: true,
      },
    });

    return NextResponse.json(destination);
  } catch (error) {
    console.log("[DESTINATION_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ destinationId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.destinationId) {
      return new NextResponse("Destination ID is required", { status: 400 });
    }

    const destination = await prismadb.tourDestination.delete({
      where: {
        id: params.destinationId,
      },
    });

    return NextResponse.json(destination);
  } catch (error) {
    console.log("[DESTINATION_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ destinationId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.destinationId) {
      return new NextResponse("Destination ID is required", { status: 400 });
    }

    const body = await req.json();
    const { name, description, imageUrl, locationId, isActive } = body;

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    if (!locationId) {
      return new NextResponse("Location ID is required", { status: 400 });
    }

    // Check if location exists
    const location = await prismadb.location.findUnique({
      where: { id: locationId }
    });

    if (!location) {
      return new NextResponse("Location not found", { status: 404 });
    }

    const destination = await prismadb.tourDestination.update({
      where: {
        id: params.destinationId,
      },
      data: {
        name,
        description,
        imageUrl,
        locationId,
        isActive,
      },
      include: {
        location: true,
      },
    });

    return NextResponse.json(destination);
  } catch (error) {
    console.log("[DESTINATION_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
