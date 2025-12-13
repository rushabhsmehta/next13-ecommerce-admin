
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
            tourPackageQueryName,
            customerName,
            customerNumber,
            tourCategory,
            numDaysNight,
            price,
            locationName,
            transport,
            pickup_location,
            drop_location,
            tourStartsFrom,
            numAdults,
            numChild5to12,
            numChild0to5,
            itineraries,
        } = body;

        if (!tourPackageQueryName || !locationName) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        // 1. Find Location
        let location = await prismadb.location.findFirst({
            where: {
                label: { contains: locationName }
            }
        });

        if (!location) {
            location = await prismadb.location.findFirst({
                where: { isActive: true }
            });
        }

        if (!location) {
            return new NextResponse("No valid location found.", { status: 400 });
        }

        // 2. Parse Date
        let startDate: Date | undefined;
        if (tourStartsFrom) {
            startDate = new Date(tourStartsFrom);
            if (isNaN(startDate.getTime())) startDate = undefined;
        }

        // 3. Create TourPackageQuery
        const query = await prismadb.tourPackageQuery.create({
            data: {
                locationId: location.id,
                tourPackageQueryName,
                customerName,
                customerNumber,
                tourCategory: tourCategory || "Domestic",
                numDaysNight,
                price: String(price || "0"),
                totalPrice: String(price || "0"),
                transport,
                pickup_location,
                drop_location,
                tourStartsFrom: startDate,
                numAdults: String(numAdults || "0"),
                numChild5to12: String(numChild5to12 || "0"),
                numChild0to5: String(numChild0to5 || "0"),
                isArchived: false,
                isFeatured: false, // Pending status usually
                assignedTo: "Unassigned",
            }
        });

        // 4. Create Itineraries with Consolidated Activities
        if (itineraries && Array.isArray(itineraries)) {
            for (const day of itineraries) {
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
                        tourPackageQueryId: query.id, // Link to Query, not Package
                        locationId: location.id,
                        dayNumber: day.dayNumber,
                        itineraryTitle: day.itineraryTitle,
                        itineraryDescription: day.itineraryDescription,
                        mealsIncluded: day.mealsIncluded,
                        hotelId: hotelId,
                        // Consolidated Activities Logic
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

        return NextResponse.json({ id: query.id });
    } catch (error) {
        console.error('[CREATE_QUERY_AI]', error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
