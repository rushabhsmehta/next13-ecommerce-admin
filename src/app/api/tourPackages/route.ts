import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

import prismadb from '@/lib/prismadb';
export const dynamic = 'force-dynamic';

async function createItineraryAndActivities(itinerary: { itineraryTitle: any; itineraryDescription: any; locationId: any; tourPackageQueryId: any; dayNumber : any; days: any; hotelId: any; numberofRooms : any; roomCategory : any; mealsIncluded: any; itineraryImages: any[]; activities: any[]; }, tourPackageId: any) {
    // First, create the itinerary and get its id
    const createdItinerary = await prismadb.itinerary.create({
        data: {
            itineraryTitle: itinerary.itineraryTitle,
            itineraryDescription: itinerary.itineraryDescription,
            locationId: itinerary.locationId,
            tourPackageId: tourPackageId,
            tourPackageQueryId: itinerary.tourPackageQueryId,
            dayNumber : itinerary.dayNumber,
            days: itinerary.days,
            hotelId: itinerary.hotelId,
            numberofRooms: itinerary.numberofRooms,
            roomCategory: itinerary.roomCategory,
            mealsIncluded: itinerary.mealsIncluded,
            itineraryImages: {
                createMany: {
                    data: itinerary.itineraryImages.map((image: { url: any; }) => ({ url: image.url })),
                },
            },
        },
    });

    // Next, create activities linked to this itinerary
    if (itinerary.activities && itinerary.activities.length > 0) {
        await Promise.all(itinerary.activities.map((activity: { activityTitle: any; activityDescription: any; locationId: any; activityImages: any[]; }) => {
            console.log("Received Activities is ", activity);
            return prismadb.activity.create({
                data: {
                    itineraryId: createdItinerary.id, // Link to the created itinerary
                    activityTitle: activity.activityTitle,
                    activityDescription: activity.activityDescription,
                    locationId: activity.locationId,
                    activityImages: {
                        createMany: {
                            data: activity.activityImages.map((img: { url: any; }) => ({ url: img.url })),
                        },
                    },
                },
            });
        }));
    }

    return createdItinerary;
}

export async function POST(
    req: Request,
  ) {
    try {
        const { userId } = auth();

        const body = await req.json();

        const {
            tourPackageName,
            tourPackageType,
            customerName,
            customerNumber,
            numDaysNight,
            locationId,
            period,
            tour_highlights,
            transport,
            pickup_location,
            drop_location,
            numAdults,
            numChild5to12,
            numChild0to5,
            price,
            pricePerAdult,
            pricePerChildOrExtraBed,
            pricePerChild5to12YearsNoBed,
            pricePerChildwithSeatBelow5Years,
            totalPrice,
            pricingSection, // Add this line
            flightDetails,            inclusions,
            exclusions,
            importantNotes,
            paymentPolicy,
            usefulTip,
            cancellationPolicy,
            airlineCancellationPolicy,
            termsconditions,
            kitchenGroupPolicy,
          //  disclaimer,
            images,
            itineraries,
            assignedTo,
            assignedToMobileNumber,
            assignedToEmail,
            slug,
            isFeatured,
            isArchived } = body;

        if (!userId) {
            return new NextResponse("Unauthenticated", { status: 403 });
        }

      /*   if (!tourPackageQueryName) {
            return new NextResponse("Tour Package Query Name is required", { status: 400 });
        }

        if (!images || !images.length) {
            return new NextResponse("Images are required", { status: 400 });
        }

        if (!price) {
            return new NextResponse("Price is required", { status: 400 });
        } */

        if (!locationId) {
            return new NextResponse("Location id is required", { status: 400 });
        }

        /*    if (!hotelId) {
               return new NextResponse("Hotel id is required", { status: 400 });
           }
    */        // Process policy fields to ensure they're arrays, then convert to JSON strings for consistent storage
        const processedInclusions = Array.isArray(inclusions) ? JSON.stringify(inclusions) : inclusions ? JSON.stringify([inclusions]) : JSON.stringify([]);
        const processedExclusions = Array.isArray(exclusions) ? JSON.stringify(exclusions) : exclusions ? JSON.stringify([exclusions]) : JSON.stringify([]);
        const processedImportantNotes = Array.isArray(importantNotes) ? JSON.stringify(importantNotes) : importantNotes ? JSON.stringify([importantNotes]) : JSON.stringify([]);
        const processedPaymentPolicy = Array.isArray(paymentPolicy) ? JSON.stringify(paymentPolicy) : paymentPolicy ? JSON.stringify([paymentPolicy]) : JSON.stringify([]);
        const processedUsefulTip = Array.isArray(usefulTip) ? JSON.stringify(usefulTip) : usefulTip ? JSON.stringify([usefulTip]) : JSON.stringify([]);
        const processedCancellationPolicy = Array.isArray(cancellationPolicy) ? JSON.stringify(cancellationPolicy) : cancellationPolicy ? JSON.stringify([cancellationPolicy]) : JSON.stringify([]);
        const processedAirlineCancellationPolicy = Array.isArray(airlineCancellationPolicy) ? JSON.stringify(airlineCancellationPolicy) : airlineCancellationPolicy ? JSON.stringify([airlineCancellationPolicy]) : JSON.stringify([]);
        const processedTermsConditions = Array.isArray(termsconditions) ? JSON.stringify(termsconditions) : termsconditions ? JSON.stringify([termsconditions]) : JSON.stringify([]);
        const processedKitchenGroupPolicy = Array.isArray(kitchenGroupPolicy) ? JSON.stringify(kitchenGroupPolicy) : kitchenGroupPolicy ? JSON.stringify([kitchenGroupPolicy]) : JSON.stringify([]);

        const newTourPackage = await prismadb.tourPackage.create({
            data: {
                tourPackageName,
                tourPackageType,
                customerName,
                customerNumber,
                numDaysNight,
                locationId,
                period, 
                tour_highlights,
                transport,
                pickup_location,
                drop_location,
                numAdults,
                numChild5to12,
                numChild0to5,
                price,
                pricePerAdult,
                pricePerChildOrExtraBed,
                pricePerChild5to12YearsNoBed,
                pricePerChildwithSeatBelow5Years,
                totalPrice,
                pricingSection, // Add this line
                //  hotelDetails,
                inclusions: processedInclusions,
                exclusions: processedExclusions,
                importantNotes: processedImportantNotes,
                paymentPolicy: processedPaymentPolicy,
                usefulTip: processedUsefulTip,                cancellationPolicy: processedCancellationPolicy,
                airlineCancellationPolicy: processedAirlineCancellationPolicy,
                termsconditions: processedTermsConditions,
                kitchenGroupPolicy: processedKitchenGroupPolicy,
            //    disclaimer,
                assignedTo,
                assignedToMobileNumber,
                assignedToEmail,
                slug,
                //   hotelId,
                        images: {
                    createMany: {
                        data: [
                            ...images.map((image: { url: string }) => image),
                        ],
                    },
                },
                flightDetails: {
                    createMany: {
                        data: [
                            ...flightDetails.map((flightDetail: { date: string, flightName: string, flightNumber: string, from: string, to: string, departureTime: string, arrivalTime: string, flightDuration: string }) => flightDetail),]
                    }
                },            },
        } as any
        )

        if (itineraries && itineraries.length > 0) {
            for (const itinerary of itineraries) {
                await createItineraryAndActivities(itinerary, newTourPackage.id);
            }
        }

        const createdTourPackage = await prismadb.tourPackage.findUnique({
            where: { id: newTourPackage.id },
            include: {
                // Include relevant relations
            },
        });


        return NextResponse.json(createdTourPackage);
    } catch (error) {
        console.log('[TOURPACKAGE__POST]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
};

export async function GET(
    req: Request,
) {
    try {
        const { searchParams } = new URL(req.url)
        const locationId = searchParams.get('locationId') || undefined;
        //  const hotelId = searchParams.get('hotelId') || undefined;
        const isFeatured = searchParams.get('isFeatured');

      

        const tourPackage = await prismadb.tourPackage.findMany({
            where: {
                        locationId,
                //hotelId,
                isFeatured: isFeatured ? true : undefined,
                isArchived: false,
            },
            include: {
                images: true,
                location: true,                itineraries: {
                    include: {
                        itineraryImages: true,
                        activities: {
                            include: {
                                activityImages: true,
                            },
                        },
                    },
                    orderBy: [
                        { dayNumber: 'asc' },
                        { days: 'asc' }
                    ]
                },
            },
            orderBy: {
                createdAt: 'desc',
            }
        });

        return NextResponse.json(tourPackage);
    } catch (error) {
        console.log('[TOUR_PACKAGES_GET]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
};

