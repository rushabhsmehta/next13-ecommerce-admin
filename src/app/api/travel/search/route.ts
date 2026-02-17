import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const [packages, destinations] = await Promise.all([
      prismadb.tourPackage.findMany({
        where: {
          isFeatured: true,
          isArchived: false,
          OR: [
            { tourPackageName: { contains: query } },
            { location: { label: { contains: query } } },
          ],
        },
        select: {
          id: true,
          tourPackageName: true,
          slug: true,
          numDaysNight: true,
          pricePerAdult: true,
          location: { select: { label: true } },
          images: { select: { url: true }, take: 1 },
        },
        take: 5,
      }),
      prismadb.location.findMany({
        where: {
          isActive: true,
          label: { contains: query },
        },
        select: {
          id: true,
          label: true,
          imageUrl: true,
          _count: {
            select: {
              tourPackages: { where: { isFeatured: true, isArchived: false } },
            },
          },
        },
        take: 3,
      }),
    ]);

    return NextResponse.json({
      results: {
        packages: packages.map((p) => ({
          type: "package" as const,
          id: p.id,
          name: p.tourPackageName,
          slug: p.slug,
          duration: p.numDaysNight,
          price: p.pricePerAdult,
          location: p.location.label,
          imageUrl: p.images[0]?.url,
        })),
        destinations: destinations
          .filter((d) => d._count.tourPackages > 0)
          .map((d) => ({
            type: "destination" as const,
            id: d.id,
            name: d.label,
            imageUrl: d.imageUrl,
            packageCount: d._count.tourPackages,
          })),
      },
    });
  } catch (error) {
    console.log("[TRAVEL_SEARCH_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
