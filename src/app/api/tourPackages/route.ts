import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

import prismadb from '@/lib/prismadb';
import { Prisma } from '@prisma/client';
export const dynamic = 'force-dynamic';

type TransactionClient = Prisma.TransactionClient;

const toJsonArrayString = (value: unknown): string => {
    if (value === null || value === undefined) {
        return JSON.stringify([]);
    }
    return JSON.stringify(Array.isArray(value) ? value : [value]);
};

const normalizeImageInput = (images: unknown): Array<{ url: string }> => {
    if (!Array.isArray(images)) {
        return [];
    }

    return images
        .map((image) => (typeof image === 'object' && image !== null ? (image as { url?: string }) : undefined))
        .filter((image): image is { url: string } => Boolean(image?.url));
};

const normalizeFlightDetails = (details: unknown): Array<{ date: string; flightName: string; flightNumber: string; from: string; to: string; departureTime: string; arrivalTime: string; flightDuration: string }> => {
    if (!Array.isArray(details)) {
        return [];
    }

    return details
        .map((detail) => (typeof detail === 'object' && detail !== null ? detail as any : undefined))
        .filter((detail): detail is { date: string; flightName: string; flightNumber: string; from: string; to: string; departureTime: string; arrivalTime: string; flightDuration: string } => Boolean(detail?.date));
};

async function createItineraryAndActivities(
    tx: TransactionClient,
    itinerary: {
        itineraryTitle: any;
        itineraryDescription: any;
        locationId: any;
        tourPackageQueryId: any;
        dayNumber: any;
        days: any;
        hotelId: any;
        numberofRooms: any;
        roomCategory: any;
        mealsIncluded: any;
        itineraryImages: any[];
        activities: any[];
    },
    tourPackageId: string,
) {
    const validationErrors: string[] = [];

    if (!itinerary?.itineraryTitle) {
        validationErrors.push(`Missing itinerary title for day ${itinerary?.dayNumber ?? 'unknown'}`);
    }

    if (!itinerary?.locationId) {
        validationErrors.push(`Missing location ID for itinerary "${itinerary?.itineraryTitle ?? 'unknown'}"`);
    }

    if (!itinerary?.dayNumber) {
        validationErrors.push(`Missing day number for itinerary "${itinerary?.itineraryTitle ?? 'unknown'}"`);
    }

    if (validationErrors.length > 0) {
        throw new Error(`Itinerary validation failed: ${validationErrors.join(', ')}`);
    }

    const createdItinerary = await tx.itinerary.create({
        data: {
            itineraryTitle: itinerary.itineraryTitle,
            itineraryDescription: itinerary.itineraryDescription,
            locationId: itinerary.locationId,
            tourPackageId,
            tourPackageQueryId: itinerary.tourPackageQueryId,
            dayNumber: itinerary.dayNumber,
            days: itinerary.days,
            hotelId: itinerary.hotelId,
            numberofRooms: itinerary.numberofRooms,
            roomCategory: itinerary.roomCategory,
            mealsIncluded: itinerary.mealsIncluded,
            itineraryImages: itinerary?.itineraryImages?.length
                ? {
                    createMany: {
                        data: itinerary.itineraryImages
                            .filter((image: any) => image?.url)
                            .map((image: { url: string }) => ({ url: image.url })),
                    },
                }
                : undefined,
        },
    });

    const activities = Array.isArray(itinerary.activities) ? itinerary.activities : [];

    if (activities.length > 0) {
        await Promise.all(
            activities.map((activity: { activityTitle: any; activityDescription: any; locationId: any; activityImages: any[]; }) =>
                tx.activity.create({
                    data: {
                        itineraryId: createdItinerary.id,
                        activityTitle: activity.activityTitle,
                        activityDescription: activity.activityDescription,
                        locationId: activity.locationId,
                        activityImages: activity?.activityImages?.length
                            ? {
                                createMany: {
                                    data: activity.activityImages
                                        .filter((img: any) => img?.url)
                                        .map((img: { url: string }) => ({ url: img.url })),
                                },
                            }
                            : undefined,
                    },
                })
            )
        );
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

        const normalizedImages = normalizeImageInput(images);
        const normalizedFlightDetails = normalizeFlightDetails(flightDetails);
        const preparedItineraries = Array.isArray(itineraries) ? itineraries : [];

        const createdTourPackage = await prismadb.$transaction(async (tx) => {
            const tourPackageRecord = await tx.tourPackage.create({
                data: {
                    tourPackageName,
                    tourPackageType,
                    customerName,
                    customerNumber,
                    numDaysNight,
                    locationId,
                    period,
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
                    pricingSection,
                    inclusions: processedInclusions,
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
                    slug,
                    images: normalizedImages.length
                        ? {
                            createMany: {
                                data: normalizedImages,
                                skipDuplicates: true,
                            },
                        }
                        : undefined,
                    flightDetails: normalizedFlightDetails.length
                        ? {
                            createMany: {
                                data: normalizedFlightDetails,
                                skipDuplicates: true,
                            },
                        }
                        : undefined,
                },
            } as any);

            if (preparedItineraries.length > 0) {
                await Promise.all(
                    preparedItineraries.map((itinerary) =>
                        createItineraryAndActivities(tx, itinerary, tourPackageRecord.id)
                    )
                );
            }

            return tx.tourPackage.findUnique({
                where: { id: tourPackageRecord.id },
                include: {
                    images: true,
                    flightDetails: true,
                    itineraries: {
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
                            { days: 'asc' },
                        ],
                    },
                },
            });
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
        const isFeaturedParam = searchParams.get('isFeatured');
        const limitParam = searchParams.get('limit');
        const summaryParam = searchParams.get('summary');

        const isFeatured =
          typeof isFeaturedParam === 'string'
            ? ['true', '1'].includes(isFeaturedParam.toLowerCase())
            : undefined;

        const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
        const limit = Number.isFinite(parsedLimit) && parsedLimit! > 0 ? Math.min(parsedLimit!, 100) : undefined;
        const summary = summaryParam ? ['true', '1'].includes(summaryParam.toLowerCase()) : false;

        const baseWhere = {
            locationId,
            isFeatured: isFeatured ? true : isFeatured === false ? false : undefined,
            isArchived: false,
        } satisfies Prisma.TourPackageWhereInput;

        const orderBy = [
            { websiteSortOrder: 'asc' as const },
            { createdAt: 'desc' as const },
        ];

        if (summary) {
            const packages = await prismadb.tourPackage.findMany({
                where: baseWhere,
                orderBy,
                take: limit,
                select: {
                    id: true,
                    slug: true,
                    locationId: true,
                    tourPackageName: true,
                    tourPackageType: true,
                    numDaysNight: true,
                    price: true,
                    createdAt: true,
                    updatedAt: true,
                    location: {
                        select: {
                            id: true,
                            label: true,
                            slug: true,
                        },
                    },
                    images: {
                        select: { url: true, createdAt: true },
                        orderBy: {
                            createdAt: 'asc',
                        },
                        take: 1,
                    },
                    tourPackagePricings: {
                        where: {
                            isActive: true,
                        },
                        select: {
                            pricingComponents: {
                                select: {
                                    price: true,
                                },
                            },
                        },
                    },
                },
            });

            const summaries = packages.map((pkg) => {
                const componentTotals = (pkg.tourPackagePricings ?? []).map((pricing) =>
                    (pricing.pricingComponents ?? []).reduce((sum, component) => {
                        const raw = component.price;
                        const numeric = typeof raw === 'string' ? Number.parseFloat(raw) : Number(raw);
                        return Number.isFinite(numeric) ? sum + numeric : sum;
                    }, 0)
                ).filter((value) => Number.isFinite(value) && value > 0);

                const lowestComponentTotal = componentTotals.length > 0 ? Math.min(...componentTotals) : null;

                const fallbackPrice = pkg.price ? Number.parseFloat(pkg.price) : NaN;
                const minimumPrice = Number.isFinite(lowestComponentTotal)
                    ? lowestComponentTotal
                    : Number.isFinite(fallbackPrice) && fallbackPrice > 0
                        ? fallbackPrice
                        : null;

                return {
                    id: pkg.id,
                    slug: pkg.slug,
                    locationId: pkg.locationId,
                    locationLabel: pkg.location?.label,
                    locationSlug: pkg.location?.slug,
                    tourPackageName: pkg.tourPackageName,
                    tourPackageType: pkg.tourPackageType,
                    numDaysNight: pkg.numDaysNight,
                    heroImageUrl: pkg.images?.[0]?.url,
                    minimumPrice,
                    createdAt: pkg.createdAt,
                    updatedAt: pkg.updatedAt,
                };
            });

            return NextResponse.json(summaries);
        }

        const tourPackage = await prismadb.tourPackage.findMany({
            where: baseWhere,
            include: {
                images: true,
                location: true,
                itineraries: {
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
            orderBy,
            take: limit,
        });

        return NextResponse.json(tourPackage);
    } catch (error) {
        console.log('[TOUR_PACKAGES_GET]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
};

