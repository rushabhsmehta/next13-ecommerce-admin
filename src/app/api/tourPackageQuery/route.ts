import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { dateToUtc } from '@/lib/timezone-utils';

import prismadb from '@/lib/prismadb';
import { createAuditLog } from "@/lib/utils/audit-logger";
import { createVariantSnapshots } from '@/lib/variant-snapshot';

// Enable caching for GET requests - revalidate every 5 minutes
export const revalidate = 300;


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
        locationId: itinerary.locationId,
        tourPackageQueryId
    });

    // Strict validation - no fallback values
    const validationErrors: string[] = [];

    if (!itinerary.itineraryTitle) {
        validationErrors.push(`Missing itinerary title for day ${itinerary.dayNumber || 'unknown'}`);
    }

    if (!itinerary.locationId) {
        validationErrors.push(`Missing location ID for itinerary "${itinerary.itineraryTitle || 'unknown'}"`);
    }

    if (!itinerary.dayNumber) {
        validationErrors.push(`Missing day number for itinerary "${itinerary.itineraryTitle || 'unknown'}"`);
    }

    if (validationErrors.length > 0) {
        console.log('❌ Itinerary validation failed:', validationErrors);
        throw new Error(`Itinerary validation failed: ${validationErrors.join(', ')}`);
    }

    try {
        // Create the itinerary with actual values (no fallbacks)
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
        if (itinerary.activities && Array.isArray(itinerary.activities) && itinerary.activities.length > 0) {
            console.log('Creating activities, count:', itinerary.activities.length);
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
        console.log('🔍 CREATING ROOM ALLOCATIONS FOR ITINERARY');
        console.log('============================================');
        console.log('Itinerary object:', JSON.stringify(itinerary, null, 2));
        console.log('Itinerary.roomAllocations type:', typeof itinerary.roomAllocations);
        console.log('Itinerary.roomAllocations value:', itinerary.roomAllocations);
        console.log('Itinerary.roomAllocations is array:', Array.isArray(itinerary.roomAllocations));

        if (itinerary.roomAllocations && Array.isArray(itinerary.roomAllocations) && itinerary.roomAllocations.length > 0) {
            console.log('Room allocations array length:', itinerary.roomAllocations.length);
            itinerary.roomAllocations.forEach((allocation: any, index: number) => {
                console.log(`Room allocation ${index}:`, JSON.stringify(allocation, null, 2));
            });

            await Promise.all(itinerary.roomAllocations.map(async (roomAllocation: any, idx: number) => {
                try {
                    // Determine roomTypeId to use: if custom is provided, map to a placeholder RoomType("Custom")
                    let roomTypeIdToUse: string | undefined = roomAllocation.roomTypeId;

                    const useCustom: boolean = !!roomAllocation.useCustomRoomType;
                    const customLabel: string = (roomAllocation.customRoomType || '').trim();

                    if (!roomTypeIdToUse) {
                        if (useCustom && customLabel.length > 0) {
                            // Find or create a placeholder RoomType named 'Custom'
                            let placeholder = await prismadb.roomType.findUnique({ where: { name: 'Custom' } });
                            if (!placeholder) {
                                placeholder = await prismadb.roomType.create({
                                    data: {
                                        name: 'Custom',
                                        description: 'Custom ad-hoc room type placeholder',
                                        isActive: true,
                                    }
                                });
                            }
                            roomTypeIdToUse = placeholder.id;
                        } else {
                            // Neither a roomTypeId nor a custom label provided
                            throw new Error(`Room allocation ${idx + 1}: roomTypeId is required unless a customRoomType is provided with useCustomRoomType=true`);
                        }
                    }

                    return await prismadb.roomAllocation.create({
                        data: {
                            itineraryId: createdItinerary.id,
                            roomTypeId: roomTypeIdToUse!,
                            occupancyTypeId: roomAllocation.occupancyTypeId,
                            mealPlanId: roomAllocation.mealPlanId,
                            quantity: roomAllocation.quantity || 1,
                            guestNames: roomAllocation.guestNames || "",
                            voucherNumber: roomAllocation.voucherNumber || "",
                            customRoomType: customLabel || "",
                        }
                    });
                } catch (roomError) {
                    console.error('Failed to create room allocation:', roomError);
                    throw roomError;
                }
            }));
        }

        // Create transport details with error handling
        if (itinerary.transportDetails && Array.isArray(itinerary.transportDetails) && itinerary.transportDetails.length > 0) {
            console.log('Creating transport details, count:', itinerary.transportDetails.length);
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
        return createdItinerary;
    } catch (error) {
        console.error("Failed to create itinerary:", itinerary.itineraryTitle, error);
        throw error;
    }
}

export async function POST(
    req: Request,
) {
    try {
        const { userId } = auth();

        const body = await req.json();

        console.log('🔍 TOUR PACKAGE QUERY API - POST REQUEST');
        console.log('========================================');
        console.log('1. Full request body:', JSON.stringify(body, null, 2));
        console.log('2. Itineraries in body:', JSON.stringify(body.itineraries, null, 2));
        if (body.itineraries) {
            body.itineraries.forEach((itinerary: any, index: number) => {
                console.log(`3. Itinerary ${index} room allocations:`, JSON.stringify(itinerary.roomAllocations, null, 2));
            });
        }
        console.log('========================================'); const {
            tourPackageQueryNumber,
            tourPackageQueryName,
            tourPackageQueryType,
            tourCategory,
            customerName,
            customerNumber,
            numDaysNight,
            locationId,
            period,
            selectedTemplateId,
            selectedTemplateType,
            tourPackageTemplateName,
            selectedMealPlanId,
            occupancySelections,
            selectedVariantIds, // Array of variant IDs to snapshot
            variantHotelOverrides, // Hotel overrides per variant
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

        // Fallback generator for Tour Package Query Number if not provided
        const generateTourPackageQueryNumber = () => {
            const now = new Date();
            const pad = (n: number) => n.toString().padStart(2, '0');
            const y = now.getFullYear();
            const m = pad(now.getMonth() + 1);
            const d = pad(now.getDate());
            const hh = pad(now.getHours());
            const mm = pad(now.getMinutes());
            const ss = pad(now.getSeconds());
            return `TPQ-${y}${m}${d}-${hh}${mm}${ss}`;
        };

        const effectiveTourPackageQueryNumber = tourPackageQueryNumber && String(tourPackageQueryNumber).trim().length > 0
            ? tourPackageQueryNumber
            : generateTourPackageQueryNumber();

        // Log all potentially undefined arrays for debugging
        console.log('🔍 ARRAY SAFETY CHECK');
        console.log('=====================');
        console.log('usefulTip type:', typeof usefulTip, 'value:', usefulTip);
        console.log('cancellationPolicy type:', typeof cancellationPolicy, 'value:', cancellationPolicy);
        console.log('airlineCancellationPolicy type:', typeof airlineCancellationPolicy, 'value:', airlineCancellationPolicy);
        console.log('termsconditions type:', typeof termsconditions, 'value:', termsconditions);
        console.log('kitchenGroupPolicy type:', typeof kitchenGroupPolicy, 'value:', kitchenGroupPolicy);
        console.log('images type:', typeof images, 'value:', images);
        console.log('flightDetails type:', typeof flightDetails, 'value:', flightDetails);
        console.log('inclusions type:', typeof inclusions, 'value:', inclusions);
        console.log('exclusions type:', typeof exclusions, 'value:', exclusions);
        console.log('importantNotes type:', typeof importantNotes, 'value:', importantNotes);
        console.log('paymentPolicy type:', typeof paymentPolicy, 'value:', paymentPolicy);
        console.log('itineraries type:', typeof itineraries, 'value:', itineraries);
        console.log('=====================');

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
        // Add comprehensive null/undefined safety checks for all array operations
        console.log('🔧 Processing policy arrays with safety checks...');
        const processedInclusions = (() => {
            console.log('Processing inclusions:', typeof inclusions, inclusions);
            if (inclusions === null || inclusions === undefined) return '';
            return Array.isArray(inclusions) ? JSON.stringify(inclusions) : JSON.stringify([inclusions]);
        })();

        const processedExclusions = (() => {
            console.log('Processing exclusions:', typeof exclusions, exclusions);
            if (exclusions === null || exclusions === undefined) return '';
            return Array.isArray(exclusions) ? JSON.stringify(exclusions) : JSON.stringify([exclusions]);
        })();

        const processedImportantNotes = (() => {
            console.log('Processing importantNotes:', typeof importantNotes, importantNotes);
            if (importantNotes === null || importantNotes === undefined) return '';
            return Array.isArray(importantNotes) ? JSON.stringify(importantNotes) : JSON.stringify([importantNotes]);
        })();

        const processedPaymentPolicy = (() => {
            console.log('Processing paymentPolicy:', typeof paymentPolicy, paymentPolicy);
            if (paymentPolicy === null || paymentPolicy === undefined) return '';
            return Array.isArray(paymentPolicy) ? JSON.stringify(paymentPolicy) : JSON.stringify([paymentPolicy]);
        })();

        const processedUsefulTip = (() => {
            console.log('Processing usefulTip:', typeof usefulTip, usefulTip);
            if (usefulTip === null || usefulTip === undefined) return '';
            return Array.isArray(usefulTip) ? JSON.stringify(usefulTip) : JSON.stringify([usefulTip]);
        })();

        const processedCancellationPolicy = (() => {
            console.log('Processing cancellationPolicy:', typeof cancellationPolicy, cancellationPolicy);
            if (cancellationPolicy === null || cancellationPolicy === undefined) return '';
            return Array.isArray(cancellationPolicy) ? JSON.stringify(cancellationPolicy) : JSON.stringify([cancellationPolicy]);
        })();

        const processedAirlineCancellationPolicy = (() => {
            console.log('Processing airlineCancellationPolicy:', typeof airlineCancellationPolicy, airlineCancellationPolicy);
            if (airlineCancellationPolicy === null || airlineCancellationPolicy === undefined) return '';
            return Array.isArray(airlineCancellationPolicy) ? JSON.stringify(airlineCancellationPolicy) : JSON.stringify([airlineCancellationPolicy]);
        })();

        const processedTermsConditions = (() => {
            console.log('Processing termsconditions:', typeof termsconditions, termsconditions);
            if (termsconditions === null || termsconditions === undefined) return '';
            return Array.isArray(termsconditions) ? JSON.stringify(termsconditions) : JSON.stringify([termsconditions]);
        })();

        const processedKitchenGroupPolicy = (() => {
            console.log('Processing kitchenGroupPolicy:', typeof kitchenGroupPolicy, kitchenGroupPolicy);
            if (kitchenGroupPolicy === null || kitchenGroupPolicy === undefined) return '';
            return Array.isArray(kitchenGroupPolicy) ? JSON.stringify(kitchenGroupPolicy) : JSON.stringify([kitchenGroupPolicy]);
        })();

        console.log('✅ All policy arrays processed successfully');

        const newTourPackageQuery = await prismadb.tourPackageQuery.create({
            data: {
                inquiryId,
                tourPackageQueryNumber: effectiveTourPackageQueryNumber,
                tourPackageQueryName,
                tourPackageQueryType,
                tourCategory,
                customerName,
                customerNumber,
                numDaysNight,
                locationId,
                period,
                // Add the new template fields to the data object
                selectedTemplateId,
                selectedTemplateType,
                tourPackageTemplateName,
                selectedMealPlanId,                // Store occupancy selections directly - don't transform it
                occupancySelections: occupancySelections || undefined, 
                selectedVariantIds: selectedVariantIds || undefined, // Store selected variant IDs
                variantHotelOverrides: variantHotelOverrides || undefined, // Store hotel overrides
                tourStartsFrom: dateToUtc(tourStartsFrom),
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
                pricingSection, // use exactly what client sends (no server fallback)
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
                        data: (() => {
                            console.log('🖼️ Processing images for createMany:');
                            console.log('images type:', typeof images);
                            console.log('images value:', images);
                            console.log('images isArray:', Array.isArray(images));

                            if (images && Array.isArray(images)) {
                                console.log('images length:', images.length);
                                const processedImages = images.map((image: { url: string }) => {
                                    console.log('Processing image:', image);
                                    return image;
                                });
                                console.log('Processed images:', processedImages);
                                return processedImages;
                            }
                            console.log('No images to process, returning empty array');
                            return [];
                        })(),
                    },
                },
                flightDetails: {
                    createMany: {
                        data: (() => {
                            console.log('✈️ Processing flightDetails for createMany:');
                            console.log('flightDetails type:', typeof flightDetails);
                            console.log('flightDetails value:', flightDetails);
                            console.log('flightDetails isArray:', Array.isArray(flightDetails));

                            if (flightDetails && Array.isArray(flightDetails)) {
                                console.log('flightDetails length:', flightDetails.length);
                                const processedFlightDetails = flightDetails.map((flightDetail: { date: string, flightName: string, flightNumber: string, from: string, to: string, departureTime: string, arrivalTime: string, flightDuration: string }) => {
                                    console.log('Processing flight detail:', flightDetail);
                                    return flightDetail;
                                });
                                console.log('Processed flight details:', processedFlightDetails);
                                return processedFlightDetails;
                            }
                            console.log('No flight details to process, returning empty array');
                            return [];
                        })(),
                    }
                },
            } as any,
        });

        if (itineraries && Array.isArray(itineraries) && itineraries.length > 0) {
            // Create all itineraries with strict validation
            console.log(`📋 Creating ${itineraries.length} itineraries with strict validation...`);
            try {
                const results = await Promise.all(
                    itineraries.map(async (itinerary: any, index: number) => {
                        try {
                            console.log(`🔄 Processing itinerary ${index + 1}/${itineraries.length}...`);
                            const result = await createItineraryAndActivities(itinerary, newTourPackageQuery.id);
                            console.log(`✅ Successfully created itinerary ${index + 1}`);
                            return result;
                        } catch (itineraryError: any) {
                            const errorMessage = `Itinerary ${index + 1} failed: ${itineraryError.message}`;
                            console.error('[ITINERARY_VALIDATION_ERROR]', {
                                index: index + 1,
                                itineraryTitle: itinerary.itineraryTitle,
                                dayNumber: itinerary.dayNumber,
                                error: errorMessage
                            });
                            // Throw error to fail the entire operation - no partial success
                            throw new Error(errorMessage);
                        }
                    })
                );

                console.log(`📊 All ${results.length} itineraries created successfully`);
            } catch (error: any) {
                console.error('[ITINERARIES_CREATION_FAILED]', error.message);
                // Delete the tour package query since itinerary creation failed
                await prismadb.tourPackageQuery.delete({
                    where: { id: newTourPackageQuery.id }
                });
                // Return detailed error message to frontend
                return new NextResponse(
                    JSON.stringify({
                        message: error.message || 'Itinerary creation failed',
                        details: 'The tour package template has missing or invalid data. Please ensure all required fields are properly filled.'
                    }),
                    { status: 400, headers: { 'Content-Type': 'application/json' } }
                );
            }
        } else {
            console.log('⚠️ No itineraries provided or empty array');
            // Delete the tour package query since no itineraries were provided
            await prismadb.tourPackageQuery.delete({
                where: { id: newTourPackageQuery.id }
            });
            return new NextResponse(
                JSON.stringify({
                    message: 'No itineraries found in the selected tour package template',
                    details: 'The selected tour package template does not contain any itineraries. Please select a different template or contact an administrator.'
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const createdTourPackageQuery = await prismadb.tourPackageQuery.findUnique({
            where: { id: newTourPackageQuery.id },
            include: {
                associatePartner: true,  // Add this line
                inquiry: true,
                // Include relevant relations
            },
        });

        // Create variant snapshots if variant IDs are provided
        if (selectedVariantIds && Array.isArray(selectedVariantIds) && selectedVariantIds.length > 0) {
            try {
                console.log(`📸 Creating variant snapshots for ${selectedVariantIds.length} variants...`);
                await createVariantSnapshots(newTourPackageQuery.id, selectedVariantIds, { overwrite: true });
                console.log('✅ Variant snapshots created successfully');
            } catch (snapshotError) {
                console.error('❌ Failed to create variant snapshots:', snapshotError);
                // Non-fatal: Continue even if snapshots fail
            }
        }

        // Attempt to create an audit log capturing who prepared the query
        try {
            await createAuditLog({
                entityId: newTourPackageQuery.id,
                entityType: "TourPackageQuery",
                action: "CREATE",
                before: null,
                after: {
                    tourPackageQueryNumber: effectiveTourPackageQueryNumber,
                    tourPackageQueryName,
                    tourPackageQueryType,
                    locationId,
                    associatePartnerId,
                },
                userRole: "ADMIN",
            });
        } catch (e) {
            console.error("[TOURPACKAGE_QUERY_AUDIT_CREATE]", e);
        }

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
        // Pagination params (page starts at 1)
        const pageParam = searchParams.get('page');
        const pageSizeParam = searchParams.get('pageSize');
        const page = Math.max(1, parseInt(pageParam || '1', 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeParam || '25', 10))); // cap at 100

        const whereClause: any = {
            locationId,
            associatePartnerId,
            isFeatured: isFeatured ? true : undefined,
            isArchived: false,
        };

        // Count total for pagination (only if client requests pagination explicitly via page/pageSize param or defaults)
        const total = await prismadb.tourPackageQuery.count({ where: whereClause });
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const safePage = Math.min(page, totalPages); // Adjust if page > totalPages

        const skip = (safePage - 1) * pageSize;

        const tourPackageQuery = await prismadb.tourPackageQuery.findMany({
            where: whereClause,
            select: {
                id: true,
                tourPackageQueryNumber: true,
                tourPackageQueryName: true,
                tourPackageQueryType: true,
                tourCategory: true,
                customerName: true,
                customerNumber: true,
                numDaysNight: true,
                locationId: true,
                period: true,
                tourStartsFrom: true,
                tourEndsOn: true,
                transport: true,
                pickup_location: true,
                drop_location: true,
                numAdults: true,
                numChild5to12: true,
                numChild0to5: true,
                price: true,
                totalPrice: true,
                remarks: true,
                assignedTo: true,
                assignedToMobileNumber: true,
                assignedToEmail: true,
                isFeatured: true,
                isArchived: true,
                createdAt: true,
                updatedAt: true,
                associatePartner: {
                    select: {
                        id: true,
                        name: true,
                        gmail: true,
                    }
                },
                images: {
                    select: {
                        id: true,
                        url: true,
                    }
                },
                location: {
                    select: {
                        id: true,
                        label: true,
                        value: true,
                    }
                },
                itineraries: {
                    select: {
                        id: true,
                        itineraryTitle: true,
                        itineraryDescription: true,
                        dayNumber: true,
                        days: true,
                        hotelId: true,
                        numberofRooms: true,
                        roomCategory: true,
                        mealsIncluded: true,
                        itineraryImages: {
                            select: {
                                id: true,
                                url: true,
                            }
                        },
                        roomAllocations: {
                            select: {
                                id: true,
                                quantity: true,
                                guestNames: true,
                                voucherNumber: true,
                                customRoomType: true,
                            }
                        },
                        transportDetails: {
                            select: {
                                id: true,
                                quantity: true,
                                description: true,
                            }
                        },
                        activities: {
                            select: {
                                id: true,
                                activityTitle: true,
                                activityDescription: true,
                                activityImages: {
                                    select: {
                                        id: true,
                                        url: true,
                                    }
                                },
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
                updatedAt: 'desc',
            },
            skip,
            take: pageSize,
        });
        // Backward compatibility note: we now always return an object with data + pagination
        return NextResponse.json({
            data: tourPackageQuery,
            pagination: {
                page: safePage,
                pageSize,
                total,
                totalPages,
                hasNextPage: safePage < totalPages,
                hasPrevPage: safePage > 1,
            }
        });
    } catch (error) {
        console.log('[TOUR_PACKAGES_GET]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
};

