import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { dateToUtc } from '@/lib/timezone-utils';

import prismadb from '@/lib/prismadb';


async function createItineraryAndActivities(itinerary: {
    itineraryTitle: any;
    itineraryDescription: any;
    locationId: any;
    tourPackageId: any;
    dayNumber: any;
    days: any;
    hotelId: any;
    numberofRooms: any;
    roomCategory: any;
    mealsIncluded: any;
    itineraryImages: any[];
    activities: any[];
    roomAllocations?: any[];
    transportDetails?: any[];
}, tourPackageQueryId: any) {
    console.log("Creating itinerary:", {
        title: itinerary.itineraryTitle,
        dayNumber: itinerary.dayNumber,
        days: itinerary.days,
        tourPackageQueryId
    });

    try {
        // First, create the itinerary and get its id
        const createdItinerary = await prismadb.itinerary.create({
            data: {
                itineraryTitle: itinerary.itineraryTitle,
                itineraryDescription: itinerary.itineraryDescription,
                locationId: itinerary.locationId,
                tourPackageId: itinerary.tourPackageId,
                tourPackageQueryId: tourPackageQueryId,
                dayNumber: itinerary.dayNumber,
                days: itinerary.days,
                hotelId: itinerary.hotelId,
                numberofRooms: itinerary.numberofRooms,
                roomCategory: itinerary.roomCategory,
                mealsIncluded: itinerary.mealsIncluded,
                itineraryImages: {
                    createMany: {
                        data: (itinerary.itineraryImages || []).map((image: { url: any; }) => ({ url: image.url })),
                    },
                },
            },
        });

        console.log("Created itinerary with ID:", createdItinerary.id);

        // Create activities in parallel with error handling
        if (itinerary.activities && itinerary.activities.length > 0) {
            await Promise.all(itinerary.activities.map(async (activity: { activityTitle: any; activityDescription: any; locationId: any; activityImages: any[]; }) => {
                try {
                    return await prismadb.activity.create({
                        data: {
                            itineraryId: createdItinerary.id,
                            activityTitle: activity.activityTitle,
                            activityDescription: activity.activityDescription,
                            locationId: activity.locationId,
                            activityImages: {
                                createMany: {
                                    data: (activity.activityImages || []).map((img: { url: any; }) => ({ url: img.url })),
                                },
                            },
                        },
                    });
                } catch (activityError) {
                    console.error('Failed to create activity:', activity.activityTitle, activityError);
                    throw activityError;
                }
            }));
        }

        // Create room allocations with error handling
        if (itinerary.roomAllocations && itinerary.roomAllocations.length > 0) {
            await Promise.all(itinerary.roomAllocations.map(async (roomAllocation: any) => {
                try {
                    return await prismadb.roomAllocation.create({
                        data: {
                            itineraryId: createdItinerary.id,
                            roomTypeId: roomAllocation.roomTypeId,
                            occupancyTypeId: roomAllocation.occupancyTypeId,
                            mealPlanId: roomAllocation.mealPlanId,
                            quantity: roomAllocation.quantity || 1,
                            guestNames: roomAllocation.guestNames || "",
                        }
                    });
                } catch (roomError) {
                    console.error('Failed to create room allocation:', roomError);
                    throw roomError;
                }
            }));
        }

        // Create transport details with error handling
        if (itinerary.transportDetails && itinerary.transportDetails.length > 0) {
            await Promise.all(itinerary.transportDetails.map(async (transport: any) => {
                try {
                    return await prismadb.transportDetail.create({
                        data: {
                            itineraryId: createdItinerary.id,
                            vehicleTypeId: transport.vehicleTypeId,
                            quantity: transport.quantity || 1,
                            description: transport.description || "",
                        }
                    });
                } catch (transportError) {
                    console.error('Failed to create transport detail:', transportError);
                    throw transportError;
                }
            }));
        }

        console.log("Successfully created itinerary and all related data for:", itinerary.itineraryTitle);
        return createdItinerary;    } catch (error) {
        console.error("Failed to create itinerary:", itinerary.itineraryTitle, error);
        throw error;
    }
}

export async function POST(
    req: Request,
) {
    try {
        const { userId } = auth();

        const body = await req.json();        const {
            tourPackageQueryNumber,
            tourPackageQueryName,
            tourPackageQueryType,
            tourCategory,
            customerName,
            customerNumber,
            numDaysNight,
            locationId,
            period,
            tour_highlights,
            selectedTemplateId,
            selectedTemplateType,
            tourPackageTemplateName,
            selectedMealPlanId,
            occupancySelections,
            tourStartsFrom,
            tourEndsOn,
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
            remarks,
            flightDetails,
            inclusions,
            exclusions,
            importantNotes,
            paymentPolicy,
            usefulTip,
            cancellationPolicy,
            airlineCancellationPolicy,
            termsconditions,
            kitchenGroupPolicy,
            images,
            itineraries,
            assignedTo,
            assignedToMobileNumber,
            assignedToEmail,
            associatePartnerId,  // Add this line
            inquiryId,
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
    */        // Process policy fields to ensure they're arrays, then convert to strings for Prisma
        const processedInclusions = Array.isArray(inclusions) ? JSON.stringify(inclusions) : inclusions ? JSON.stringify([inclusions]) : '';
        const processedExclusions = Array.isArray(exclusions) ? JSON.stringify(exclusions) : exclusions ? JSON.stringify([exclusions]) : '';
        const processedImportantNotes = Array.isArray(importantNotes) ? JSON.stringify(importantNotes) : importantNotes ? JSON.stringify([importantNotes]) : '';
        const processedPaymentPolicy = Array.isArray(paymentPolicy) ? JSON.stringify(paymentPolicy) : paymentPolicy ? JSON.stringify([paymentPolicy]) : '';
        const processedUsefulTip = Array.isArray(usefulTip) ? JSON.stringify(usefulTip) : usefulTip ? JSON.stringify([usefulTip]) : '';
        const processedCancellationPolicy = Array.isArray(cancellationPolicy) ? JSON.stringify(cancellationPolicy) : cancellationPolicy ? JSON.stringify([cancellationPolicy]) : '';
        const processedAirlineCancellationPolicy = Array.isArray(airlineCancellationPolicy) ? JSON.stringify(airlineCancellationPolicy) : airlineCancellationPolicy ? JSON.stringify([airlineCancellationPolicy]) : '';
        const processedTermsConditions = Array.isArray(termsconditions) ? JSON.stringify(termsconditions) : termsconditions ? JSON.stringify([termsconditions]) : '';
        const processedKitchenGroupPolicy = Array.isArray(kitchenGroupPolicy) ? JSON.stringify(kitchenGroupPolicy) : kitchenGroupPolicy ? JSON.stringify([kitchenGroupPolicy]) : '';

        const newTourPackageQuery = await prismadb.tourPackageQuery.create({
            data: {
                inquiryId,
                tourPackageQueryNumber,
                tourPackageQueryName,
                tourPackageQueryType,
                tourCategory,
                customerName,
                customerNumber,
                numDaysNight,
                locationId,
                period,
                tour_highlights,
                // Add the new template fields to the data object
                selectedTemplateId,
                selectedTemplateType,
                tourPackageTemplateName,
                selectedMealPlanId,                // Store occupancy selections directly - don't transform it
                occupancySelections: occupancySelections || undefined,                tourStartsFrom: dateToUtc(tourStartsFrom),
                tourEndsOn: dateToUtc(tourEndsOn),
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
                remarks,
                //  hotelDetails,                inclusions: processedInclusions,
                exclusions: processedExclusions,
                importantNotes: processedImportantNotes,
                paymentPolicy: processedPaymentPolicy,
                usefulTip: processedUsefulTip,
                cancellationPolicy: processedCancellationPolicy,
                airlineCancellationPolicy: processedAirlineCancellationPolicy,
                termsconditions: processedTermsConditions,
                kitchenGroupPolicy: processedKitchenGroupPolicy,
                assignedTo,
                assignedToMobileNumber,
                assignedToEmail,
                associatePartnerId,  // Add this line
                //   hotelId,
                images: {
                    createMany: {
                        data: [
                            ...images.map((image: { url: string }) => image),
                        ],
                    },
                },
                flightDetails: {
                    createMany: {                        data: [
                            ...flightDetails.map((flightDetail: { date: string, flightName: string, flightNumber: string, from: string, to: string, departureTime: string, arrivalTime: string, flightDuration: string }) => flightDetail),
                        ]
                    }
                },
            } as any,
        });

        if (itineraries && itineraries.length > 0) {
            // Create all itineraries in parallel with better error handling
            try {
                await Promise.all(
                    itineraries.map(async (itinerary: any) => {
                        try {
                            await createItineraryAndActivities(itinerary, newTourPackageQuery.id);
                        } catch (itineraryError) {
                            console.error('[ITINERARY_CREATION_ERROR]', {
                                itineraryTitle: itinerary.itineraryTitle,
                                dayNumber: itinerary.dayNumber,
                                error: itineraryError
                            });
                            // Re-throw to fail the entire operation if any itinerary fails
                            throw itineraryError;
                        }
                    })
                );
            } catch (error) {
                console.error('[ITINERARIES_CREATION_FAILED]', error);
                // Delete the tour package query if itinerary creation fails
                await prismadb.tourPackageQuery.delete({
                    where: { id: newTourPackageQuery.id }
                });
                throw new Error("Failed to create itineraries");
            }
        }

        const createdTourPackageQuery = await prismadb.tourPackageQuery.findUnique({
            where: { id: newTourPackageQuery.id },
            include: {
                associatePartner: true,  // Add this line
                inquiry: true,
                // Include relevant relations
            },
        });


        return NextResponse.json(createdTourPackageQuery);
    } catch (error) {
        console.log('[TOURPACKAGE_QUERY_POST]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
};

export async function GET(
    req: Request,
) {
    try {
        const { searchParams } = new URL(req.url)
        const locationId = searchParams.get('locationId') || undefined;
        const associatePartnerId = searchParams.get('associatePartnerId') || undefined;  // Add this line
        //  const hotelId = searchParams.get('hotelId') || undefined;
        const isFeatured = searchParams.get('isFeatured');


        const tourPackageQuery = await prismadb.tourPackageQuery.findMany({
            where: {
                locationId,
                associatePartnerId,  // Add this line
                //hotelId,
                isFeatured: isFeatured ? true : undefined,
                isArchived: false,
            },
            include: {
                associatePartner: true,  // Add this line
                images: true,                location: true, itineraries: {
                    include: {
                        itineraryImages: true,
                        roomAllocations: true,
                        transportDetails: true,
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
                createdAt: 'asc',
            }
        });

        return NextResponse.json(tourPackageQuery);
    } catch (error) {
        console.log('[TOUR_PACKAGES_GET]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
};

