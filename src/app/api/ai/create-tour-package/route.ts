import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const {
      tourPackageName,
      tourCategory,
      tourPackageType,
      numDaysNight,
      price,
      locationName,
      transport,
      pickup_location,
      drop_location,
      itineraries,
      inclusions,
      exclusions,
      importantNotes,
      paymentPolicy,
      cancellationPolicy,
      termsconditions
    } = body;

    if (!tourPackageName || !locationName) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // 1. Find or use a default Location
    // We try to find a location by name (case-insensitive search would be ideal, but Prisma is limited)
    // For now, we'll just try to find one that contains the string, or pick the first one.
    // In a real app, we might want to create a new location or fail.
    let location = await prismadb.location.findFirst({
      where: {
        label: {
          contains: locationName
        }
      }
    });

    if (!location) {
      // Fallback: Try to find ANY location to attach to (Draft mode)
      // Or create a "Draft Location" - but that pollutes the DB.
      // Let's just pick the first active location and let the user change it.
      location = await prismadb.location.findFirst({
        where: { isActive: true }
      });
    }

    if (!location) {
      return new NextResponse("No valid location found in database to attach package to.", { status: 400 });
    }

    // 2. Create the Tour Package
    const tourPackage = await prismadb.tourPackage.create({
      data: {
        locationId: location.id,
        tourPackageName,
        tourCategory: tourCategory || "Domestic",
        tourPackageType: tourPackageType || "General",
        numDaysNight,
        price: String(price),
        transport,
        pickup_location,
        drop_location,
        isArchived: true, // Draft mode
        isFeatured: false,
        inclusions: inclusions ? { values: inclusions } : undefined,
        exclusions: exclusions ? { values: exclusions } : undefined,
        importantNotes: importantNotes ? { values: importantNotes } : undefined,
        paymentPolicy: paymentPolicy ? { values: paymentPolicy } : undefined,
        cancellationPolicy: cancellationPolicy ? { values: cancellationPolicy } : undefined,
        termsconditions: termsconditions ? { values: termsconditions } : undefined,
      }
    });

    // 3. Create Itineraries
    if (itineraries && Array.isArray(itineraries)) {
      for (const day of itineraries) {
        // Try to find hotel
        let hotelId = null;
        if (day.hotelName) {
          const hotel = await prismadb.hotel.findFirst({
            where: {
              name: { contains: day.hotelName },
              locationId: location.id
            }
          });
          if (hotel) hotelId = hotel.id;
        }

        await prismadb.itinerary.create({
          data: {
            tourPackageId: tourPackage.id,
            locationId: location.id,
            dayNumber: day.dayNumber,
            itineraryTitle: day.itineraryTitle,
            itineraryDescription: day.itineraryDescription,
            mealsIncluded: day.mealsIncluded,
            hotelId: hotelId,
            activities: day.activities && Array.isArray(day.activities) && day.activities.length > 0 ? {
              create: [{
                activityTitle: "Day Highlights",
                activityDescription: day.activities.map((act: string, i: number) =>
                  `${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][i] || (i + 1) + '.'}. ${act}`
                ).join('<br/>'),
                locationId: location.id
              }]
            } : undefined
          }
        });
      }
    }

    return NextResponse.json({ id: tourPackage.id });
  } catch (error) {
    console.error('[CREATE_TOUR_PACKAGE_AI]', error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
