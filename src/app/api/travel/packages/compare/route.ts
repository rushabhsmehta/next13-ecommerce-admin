import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import {
  PACKAGE_OFFER_FIELDS,
  buildPublicOfferPayload,
} from "@/lib/package-offers";

export const dynamic = "force-dynamic";

const MAX_COMPARE = 3;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawIds = searchParams.get("ids") || "";
    const ids = rawIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, MAX_COMPARE);

    if (ids.length === 0) {
      return NextResponse.json({ packages: [] });
    }

    const now = new Date();
    const packages = await prismadb.tourPackage.findMany({
      where: {
        id: { in: ids },
        isFeatured: true,
        isArchived: false,
      },
      select: {
        id: true,
        tourPackageName: true,
        slug: true,
        numDaysNight: true,
        tourCategory: true,
        price: true,
        pricePerAdult: true,
        pickup_location: true,
        drop_location: true,
        transport: true,
        ...PACKAGE_OFFER_FIELDS,
        location: { select: { label: true } },
        images: { select: { url: true }, take: 1 },
        _count: { select: { itineraries: true } },
      },
    });

    const byId = new Map(packages.map((pkg) => [pkg.id, pkg]));
    const ordered = ids
      .map((id) => byId.get(id))
      .filter((pkg): pkg is NonNullable<typeof pkg> => Boolean(pkg))
      .map((pkg) => ({
        ...pkg,
        ...buildPublicOfferPayload(pkg, now),
      }));

    return NextResponse.json({ packages: ordered });
  } catch (error) {
    console.log("[TRAVEL_PACKAGES_COMPARE_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
