import { NextResponse } from "next/server";

import prismadb from "@/lib/prismadb";
import { buildPublicOfferPayload } from "@/lib/package-offers";

export async function GET(req: Request, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  try {
    const now = new Date();
    if (!params.slug) {
      return new NextResponse("Tour Package Slug is required", { status: 400 });
    }

    const tourPackage = await prismadb.tourPackage.findFirst({
      where: {
        OR: [{ slug: params.slug }, { id: params.slug }],
        isArchived: false,
        isFeatured: true,
      },
      include: {
        flightDetails: true,
        images: true,
        location: true,
        //hotel: true,
        itineraries: {
          include: {
            itineraryImages: true,
            hotel: {
              include: {
                images: true,
              },
            },
            activities: {
              include: {
                activityImages: true,
              },
            },
          },
          orderBy: [
            { dayNumber: 'asc' },
            { days: 'asc' },
          ],
        },
      },
    },)
    return NextResponse.json(
      tourPackage
        ? {
            ...tourPackage,
            ...buildPublicOfferPayload(tourPackage, now),
          }
        : null
    );
  } catch (error) {
    console.log('[TOUR_PACKAGE__GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};


