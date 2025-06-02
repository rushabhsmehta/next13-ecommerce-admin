import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs';

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
    console.log("[ITINERARY_CREATE] Starting itinerary creation for tourPackageQueryId:", tourPackageQueryId);
    console.log("[ITINERARY_CREATE] Itinerary data:", itinerary.itineraryTitle);
    console.log("[ITINERARY_CREATE] Received itinerary with roomAllocations:", itinerary.roomAllocations?.length || 0);
    console.log("[ITINERARY_CREATE] Received itinerary with transportDetails:", itinerary.transportDetails?.length || 0);
    console.log("[ITINERARY_CREATE] Received itinerary with activities:", itinerary.activities?.length || 0);
    console.log("[ITINERARY_CREATE] Received itinerary with images:", itinerary.itineraryImages?.length || 0);

    try {
        // First, create the itinerary and get its id
        console.log("[ITINERARY_CREATE] Creating main itinerary record...");
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
                        data: (itinerary.itineraryImages && itinerary.itineraryImages.length > 0) ? 
                            itinerary.itineraryImages.map((image: { url: any; }) => ({ url: image.url })) : [],
                    },
                },
            },
        });
        console.log("[ITINERARY_CREATE] Main itinerary created with ID:", createdItinerary.id);

        // Next, create activities linked to this itinerary
        if (itinerary.activities && itinerary.activities.length > 0) {
            console.log("[ITINERARY_CREATE] Creating", itinerary.activities.length, "activities...");
            await Promise.all(itinerary.activities.map((activity: { activityTitle: any; activityDescription: any; locationId: any; activityImages: any[]; }, index: number) => {
                console.log(`[ITINERARY_CREATE] Creating activity ${index + 1}:`, activity.activityTitle);
                return prismadb.activity.create({
                    data: {
                        itineraryId: createdItinerary.id, // Link to the created itinerary
                        activityTitle: activity.activityTitle,
                        activityDescription: activity.activityDescription,
                        locationId: activity.locationId,
                        activityImages: {
                            createMany: {
                                data: (activity.activityImages && activity.activityImages.length > 0) ?
                                    activity.activityImages.map((img: { url: any; }) => ({ url: img.url })) : [],
                            },
                        },
                    },
                });
            }));
            console.log("[ITINERARY_CREATE] All activities created successfully");
        } else {
            console.log("[ITINERARY_CREATE] No activities to create");
        }

        // Create room allocations for this itinerary
        if (itinerary.roomAllocations && itinerary.roomAllocations.length > 0) {
            console.log("[ITINERARY_CREATE] Creating", itinerary.roomAllocations.length, "room allocations...");
            await Promise.all(itinerary.roomAllocations.map((roomAllocation: any, index: number) => {
                console.log(`[ITINERARY_CREATE] Creating room allocation ${index + 1}`);
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
            console.log("[ITINERARY_CREATE] All room allocations created successfully");
        } else {
            console.log("[ITINERARY_CREATE] No room allocations to create");
        }
        
        // Create transport details for this itinerary
        if (itinerary.transportDetails && itinerary.transportDetails.length > 0) {
            console.log("[ITINERARY_CREATE] Creating", itinerary.transportDetails.length, "transport details...");
            await Promise.all(itinerary.transportDetails.map((transport: any, index: number) => {
                console.log(`[ITINERARY_CREATE] Creating transport detail ${index + 1}`);
                return prismadb.transportDetail.create({
                    data: {
                        itineraryId: createdItinerary.id,
                        vehicleTypeId: transport.vehicleTypeId,
                        quantity: transport.quantity,
                        description: transport.description || "",
                    }
                });
            }));
            console.log("[ITINERARY_CREATE] All transport details created successfully");
        } else {
            console.log("[ITINERARY_CREATE] No transport details to create");
        }

        console.log("[ITINERARY_CREATE] Itinerary and all related records created successfully!");
        return createdItinerary;
    } catch (error: any) {
        console.log("[ITINERARY_CREATE] ERROR:", error);
        console.log("[ITINERARY_CREATE] Error type:", typeof error);
        console.log("[ITINERARY_CREATE] Error message:", error?.message);
        console.log("[ITINERARY_CREATE] Error code:", error?.code);
        throw error; // Re-throw to be handled by the main function
    }
}

export async function POST(
    req: Request,
) {
    try {
        const { userId } = auth();
        console.log('[TOURPACKAGE_QUERY_POST] Starting request processing...');
        console.log('[TOURPACKAGE_QUERY_POST] User ID:', userId);

        const body = await req.json();
        console.log('[TOURPACKAGE_QUERY_POST] Request body keys:', Object.keys(body));
        console.log('[TOURPACKAGE_QUERY_POST] Request body size:', JSON.stringify(body).length);        const {
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

        console.log('[TOURPACKAGE_QUERY_POST] Destructured fields check:');
        console.log('- tourPackageQueryName:', tourPackageQueryName);
        console.log('- locationId:', locationId);
        console.log('- associatePartnerId:', associatePartnerId);
        console.log('- customerName:', customerName);
        console.log('- customerNumber:', customerNumber);
        console.log('- inquiryId:', inquiryId);
        console.log('- images array length:', images?.length || 0);
        console.log('- flightDetails array length:', flightDetails?.length || 0);
        console.log('- itineraries array length:', itineraries?.length || 0);        if (!userId) {
            console.log('[TOURPACKAGE_QUERY_POST] ERROR: Unauthenticated user');
            return new NextResponse("Unauthenticated", { status: 403 });
        }

        console.log('[TOURPACKAGE_QUERY_POST] User authenticated, proceeding with validation...');

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
            console.log('[TOURPACKAGE_QUERY_POST] ERROR: Location id is missing');
            return new NextResponse("Location id is required", { status: 400 });
        }        // For associate domain requests, get the associate partner ID from the authenticated user
        let finalAssociatePartnerId = associatePartnerId;
        
        if (!finalAssociatePartnerId) {
            console.log('[TOURPACKAGE_QUERY_POST] Associate partner id not provided, attempting to get from authenticated user...');
            
            // Get current user from Clerk
            const user = await currentUser();
            if (user) {
                const userEmail = user.emailAddresses[0]?.emailAddress;
                console.log('[TOURPACKAGE_QUERY_POST] User email:', userEmail);
                
                if (userEmail) {
                    // Try to find the associate partner by gmail (primary) or email (fallback)
                    const associatePartner = await prismadb.associatePartner.findFirst({
                        where: {
                            OR: [
                                { gmail: userEmail },
                                { email: userEmail }
                            ],
                            isActive: true
                        }
                    });
                    
                    if (associatePartner) {
                        finalAssociatePartnerId = associatePartner.id;
                        console.log('[TOURPACKAGE_QUERY_POST] Found associate partner from user email:', finalAssociatePartnerId);
                    } else {
                        console.log('[TOURPACKAGE_QUERY_POST] No associate partner found for user email:', userEmail);
                    }
                }
            }
        }
        
        if (!finalAssociatePartnerId) {
            console.log('[TOURPACKAGE_QUERY_POST] ERROR: Associate partner id could not be determined');
            return new NextResponse("Associate partner id is required", { status: 400 });
        }

        console.log('[TOURPACKAGE_QUERY_POST] Required fields validation passed');        console.log('[TOURPACKAGE_QUERY_POST] Required fields validation passed');

        /*    if (!hotelId) {
               return new NextResponse("Hotel id is required", { status: 400 });
           }
    */
        console.log('[TOURPACKAGE_QUERY_POST] Starting policy fields processing...');
        // Process policy fields to ensure they're arrays, then convert to strings for Prisma
        const processedInclusions = Array.isArray(inclusions) ? JSON.stringify(inclusions) : inclusions ? JSON.stringify([inclusions]) : '';
        const processedExclusions = Array.isArray(exclusions) ? JSON.stringify(exclusions) : exclusions ? JSON.stringify([exclusions]) : '';
        const processedImportantNotes = Array.isArray(importantNotes) ? JSON.stringify(importantNotes) : importantNotes ? JSON.stringify([importantNotes]) : '';
        const processedPaymentPolicy = Array.isArray(paymentPolicy) ? JSON.stringify(paymentPolicy) : paymentPolicy ? JSON.stringify([paymentPolicy]) : '';
        const processedUsefulTip = Array.isArray(usefulTip) ? JSON.stringify(usefulTip) : usefulTip ? JSON.stringify([usefulTip]) : '';
        const processedCancellationPolicy = Array.isArray(cancellationPolicy) ? JSON.stringify(cancellationPolicy) : cancellationPolicy ? JSON.stringify([cancellationPolicy]) : '';
        const processedAirlineCancellationPolicy = Array.isArray(airlineCancellationPolicy) ? JSON.stringify(airlineCancellationPolicy) : airlineCancellationPolicy ? JSON.stringify([airlineCancellationPolicy]) : '';
        const processedTermsConditions = Array.isArray(termsconditions) ? JSON.stringify(termsconditions) : termsconditions ? JSON.stringify([termsconditions]) : '';
        const processedKitchenGroupPolicy = Array.isArray(kitchenGroupPolicy) ? JSON.stringify(kitchenGroupPolicy) : kitchenGroupPolicy ? JSON.stringify([kitchenGroupPolicy]) : '';

        console.log('[TOURPACKAGE_QUERY_POST] Policy fields processed, starting main record creation...');        console.log('[TOURPACKAGE_QUERY_POST] Policy fields processed, starting main record creation...');

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
                //  hotelDetails,
                inclusions: processedInclusions,
                exclusions: processedExclusions,
                importantNotes: processedImportantNotes,
                paymentPolicy: processedPaymentPolicy,
                usefulTip: processedUsefulTip,
                cancellationPolicy: processedCancellationPolicy,
                airlineCancellationPolicy: processedAirlineCancellationPolicy,
                termsconditions: processedTermsConditions,                kitchenGroupPolicy: processedKitchenGroupPolicy,
                assignedTo,
                assignedToMobileNumber,
                assignedToEmail,
                associatePartnerId: finalAssociatePartnerId,
                //   hotelId,
                images: {
                    createMany: {
                        data: [
                            ...(images && images.length > 0 ? images.map((image: { url: string }) => image) : []),
                        ],
                    },
                },
                flightDetails: {
                    createMany: {
                        data: [
                            ...(flightDetails && flightDetails.length > 0 ? flightDetails.map((flightDetail: { date: string, flightName: string, flightNumber: string, from: string, to: string, departureTime: string, arrivalTime: string, flightDuration: string }) => flightDetail) : []),
                        ]
                    }
                },
            } as any,
        });

        console.log('[TOURPACKAGE_QUERY_POST] Main record created successfully, ID:', newTourPackageQuery.id);        console.log('[TOURPACKAGE_QUERY_POST] Main record created successfully, ID:', newTourPackageQuery.id);

        if (itineraries && itineraries.length > 0) {
            console.log('[TOURPACKAGE_QUERY_POST] Processing', itineraries.length, 'itineraries...');
            for (const itinerary of itineraries) {
                console.log('[TOURPACKAGE_QUERY_POST] Creating itinerary:', itinerary.itineraryTitle);
                await createItineraryAndActivities(itinerary, newTourPackageQuery.id);
            }
            console.log('[TOURPACKAGE_QUERY_POST] All itineraries processed successfully');
        } else {
            console.log('[TOURPACKAGE_QUERY_POST] No itineraries to process');
        }

        console.log('[TOURPACKAGE_QUERY_POST] Fetching created record with relations...');        console.log('[TOURPACKAGE_QUERY_POST] Fetching created record with relations...');

        const createdTourPackageQuery = await prismadb.tourPackageQuery.findUnique({
            where: { id: newTourPackageQuery.id },
            include: {
                associatePartner: true,  // Add this line
                inquiry: true,
                // Include relevant relations
            },
        });

        console.log('[TOURPACKAGE_QUERY_POST] Record created and fetched successfully!');
        return NextResponse.json(createdTourPackageQuery);
    } catch (error: any) {
        console.log('[TOURPACKAGE_QUERY_POST] ERROR occurred:', error);
        console.log('[TOURPACKAGE_QUERY_POST] Error type:', typeof error);
        console.log('[TOURPACKAGE_QUERY_POST] Error message:', error?.message);
        console.log('[TOURPACKAGE_QUERY_POST] Error code:', error?.code);
        console.log('[TOURPACKAGE_QUERY_POST] Error stack:', error?.stack);
        
        // Prisma specific error handling
        if (error?.code) {
            switch (error.code) {
                case 'P2002':
                    console.log('[TOURPACKAGE_QUERY_POST] Prisma P2002 - Unique constraint violation');
                    return new NextResponse("A record with this data already exists", { status: 409 });
                case 'P2003':
                    console.log('[TOURPACKAGE_QUERY_POST] Prisma P2003 - Foreign key constraint violation');
                    return new NextResponse("Invalid reference to related data", { status: 400 });
                case 'P2025':
                    console.log('[TOURPACKAGE_QUERY_POST] Prisma P2025 - Record not found');
                    return new NextResponse("Referenced record not found", { status: 404 });
                default:
                    console.log('[TOURPACKAGE_QUERY_POST] Prisma error with code:', error.code);
                    return new NextResponse(`Database error: ${error.message}`, { status: 500 });
            }
        }
        
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

