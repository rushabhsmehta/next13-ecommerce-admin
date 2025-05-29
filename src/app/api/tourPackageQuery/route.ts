import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

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
    console.log("Received itinerary with roomAllocations:", itinerary.roomAllocations);
    console.log("Received itinerary with transportDetails:", itinerary.transportDetails);

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
                    data: itinerary.itineraryImages.map((image: { url: any; }) => ({ url: image.url })),
                },
            },
        },
    });

    // Next, create activities linked to this itinerary
    if (itinerary.activities && itinerary.activities.length > 0) {
        await Promise.all(itinerary.activities.map((activity: { activityTitle: any; activityDescription: any; locationId: any; activityImages: any[]; }) => {
            // console.log("Received Activities is ", activity);
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

    // Create room allocations for this itinerary
    if (itinerary.roomAllocations && itinerary.roomAllocations.length > 0) {
        await Promise.all(itinerary.roomAllocations.map((roomAllocation: any) => {
            return prismadb.roomAllocation.create({
                data: {
                    itineraryId: createdItinerary.id,
                    roomTypeId: roomAllocation.roomTypeId,
                    occupancyTypeId: roomAllocation.occupancyTypeId,
                    mealPlanId: roomAllocation.mealPlanId,
                    quantity: roomAllocation.quantity,
                    guestNames: roomAllocation.guestNames || "",
                    roomType: roomAllocation.roomType || "Standard",
                    occupancyType: roomAllocation.occupancyType || "Single",
                }
            });
        }));
    }
    // Create transport details for this itinerary
    if (itinerary.transportDetails && itinerary.transportDetails.length > 0) {
        await Promise.all(itinerary.transportDetails.map((transport: any) => {
            return prismadb.transportDetail.create({
                data: {
                    itineraryId: createdItinerary.id,
                    vehicleTypeId: transport.vehicleTypeId,
                    quantity: transport.quantity,
                    description: transport.description || "",
                }
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

        const body = await req.json();        const {
            tourPackageQueryNumber,
            tourPackageQueryName,
            tourPackageQueryType,
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
                selectedMealPlanId,
                // Store occupancy selections directly - don't transform it
                occupancySelections: occupancySelections || undefined,
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
                    createMany: {
                        data: [
                            ...flightDetails.map((flightDetail: { date: string, flightName: string, flightNumber: string, from: string, to: string, departureTime: string, arrivalTime: string, flightDuration: string }) => flightDetail),]
                    }                },
            } as any,
        }
        )

        if (itineraries && itineraries.length > 0) {
            for (const itinerary of itineraries) {
                await createItineraryAndActivities(itinerary, newTourPackageQuery.id);
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
                images: true,
                location: true, itineraries: {
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
                },
            },
            orderBy: {
                createdAt: 'desc',
            }
        });

        return NextResponse.json(tourPackageQuery);
    } catch (error) {
        console.log('[TOUR_PACKAGES_GET]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
};

