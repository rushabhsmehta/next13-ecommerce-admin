import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const destinations = await prismadb.location.findMany({
      where: { isActive: true },
      select: {
        id: true,
        label: true,
        imageUrl: true,
        slug: true,
        tags: true,
        _count: {
          select: {
            tourPackages: {
              where: { isFeatured: true, isArchived: false },
            },
          },
        },
      },
      orderBy: { label: "asc" },
    });

    const activeDestinations = destinations.filter(
      (d) => d._count.tourPackages > 0
    );

    return NextResponse.json({ destinations: activeDestinations });
  } catch (error) {
    console.log("[TRAVEL_DESTINATIONS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
