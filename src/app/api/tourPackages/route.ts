import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import prismadb from '@/lib/prismadb';
import { Prisma } from '@prisma/client';
import { normalizeTourPackageSlugInput } from '@/lib/location-slug';
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

const toNullableDate = (value: unknown): Date | null => {
    if (!value || typeof value !== 'string' || !value.trim()) {
        return null;
    }
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
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

const numericDayFromValue = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) && String(parsed) === value.trim() ? parsed : null;
    }
    return null;
};

async function createInitialPackageVariants(
    tx: TransactionClient,
    params: {
        tourPackageId: string;
        packageVariants: any[];
        sourceItineraries: any[];
        createdItineraries: Array<{ id: string; dayNumber: number | null }>;
    },
) {
    const { tourPackageId, packageVariants, sourceItineraries, createdItineraries } = params;
    if (!Array.isArray(packageVariants) || packageVariants.length === 0) {
        return;
    }

    const sourceKeyToDay = new Map<string, number>();
    sourceItineraries.forEach((itinerary, index) => {
        const dayNumber = numericDayFromValue(itinerary?.dayNumber) ?? index + 1;
        if (itinerary?.id) {
            sourceKeyToDay.set(String(itinerary.id), dayNumber);
        }
        sourceKeyToDay.set(String(dayNumber), dayNumber);
    });

    const dayToCreatedId = new Map<number, string>();
    createdItineraries.forEach((itinerary) => {
        if (itinerary.dayNumber != null) {
            dayToCreatedId.set(itinerary.dayNumber, itinerary.id);
        }
    });

    for (const variant of packageVariants) {
        if (!variant?.name) {
            continue;
        }

        const createdVariant = await tx.packageVariant.create({
            data: {
                name: variant.name,
                description: variant.description || null,
                isDefault: Boolean(variant.isDefault),
                sortOrder: Number.isFinite(Number(variant.sortOrder)) ? Number(variant.sortOrder) : 0,
                priceModifier: Number.isFinite(Number(variant.priceModifier)) ? Number(variant.priceModifier) : 0,
                tourPackageId,
            },
        });

        const hotelMappings = variant.hotelMappings && typeof variant.hotelMappings === 'object'
            ? Object.entries(variant.hotelMappings)
                .map(([sourceKey, hotelId]) => {
                    if (!hotelId || typeof hotelId !== 'string') {
                        return null;
                    }

                    const dayNumber = sourceKeyToDay.get(sourceKey) ?? numericDayFromValue(sourceKey);
                    if (dayNumber == null) {
                        return null;
                    }

                    const itineraryId = dayToCreatedId.get(dayNumber);
                    if (!itineraryId) {
                        return null;
                    }

                    return {
                        packageVariantId: createdVariant.id,
                        itineraryId,
                        hotelId,
                    };
                })
                .filter((mapping): mapping is { packageVariantId: string; itineraryId: string; hotelId: string } => Boolean(mapping))
            : [];

        if (hotelMappings.length > 0) {
            await tx.variantHotelMapping.createMany({
                data: hotelMappings,
            });
        }

        if (variant.copiedFromTourPackageId) {
            const sourcePricings = await tx.tourPackagePricing.findMany({
                where: {
                    tourPackageId: variant.copiedFromTourPackageId,
                    packageVariantId: null,
                },
                include: {
                    pricingComponents: true,
                },
                orderBy: {
                    startDate: 'asc',
                },
            });

            if (sourcePricings.length > 0) {
                await Promise.all(
                    sourcePricings.map((pricing) =>
                        tx.tourPackagePricing.create({
                            data: {
                                tourPackageId,
                                packageVariantId: createdVariant.id,
                                startDate: pricing.startDate,
                                endDate: pricing.endDate,
                                isActive: pricing.isActive,
                                description: pricing.description,
                                mealPlanId: pricing.mealPlanId,
                                numberOfRooms: pricing.numberOfRooms,
                                locationSeasonalPeriodId: pricing.locationSeasonalPeriodId,
                                isGroupPricing: pricing.isGroupPricing,
                                vehicleTypeId: pricing.vehicleTypeId,
                                pricingComponents: pricing.pricingComponents.length > 0
                                    ? {
                                        create: pricing.pricingComponents.map((component) => ({
                                            pricingAttributeId: component.pricingAttributeId,
                                            price: component.price,
                                            purchasePrice: component.purchasePrice,
                                            description: component.description,
                                        })),
                                    }
                                    : undefined,
                            },
                        })
                    )
                );
            }
        }
    }
}

export async function POST(
    req: Request,
) {
    try {
        const { userId } = await auth();

        const body = await req.json();

        const {
            tourPackageName,
            tourPackageType,
            customerName,
            customerNumber,
            numDaysNight,
            locationId,
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
            flightDetails, inclusions,
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
            // assignedTo,
            // assignedToEmail,
            slug,
            isFeatured,
            isOffer,
            offerTitle,
            offerSubtitle,
            offerBadge,
            offerPrice,
            offerOriginalPrice,
            offerStartsAt,
            offerEndsAt,
            offerSortOrder,
            offerTerms,
            packageVariants,
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
        const normalizedSlug = normalizeTourPackageSlugInput(slug, tourPackageName);

        const createdTourPackage = await prismadb.$transaction(async (tx) => {
            const tourPackageRecord = await tx.tourPackage.create({
                data: {
                    tourPackageName,
                    tourPackageType,
                    customerName,
                    customerNumber,
                    numDaysNight,
                    locationId,
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
                    // assignedTo,
                    // assignedToEmail,
                    slug: normalizedSlug,
                    isFeatured,
                    isArchived,
                    isOffer: Boolean(isOffer),
                    offerTitle: offerTitle?.trim?.() || null,
                    offerSubtitle: offerSubtitle?.trim?.() || null,
                    offerBadge: offerBadge?.trim?.() || null,
                    offerPrice: offerPrice?.trim?.() || null,
                    offerOriginalPrice: offerOriginalPrice?.trim?.() || null,
                    offerStartsAt: toNullableDate(offerStartsAt),
                    offerEndsAt: toNullableDate(offerEndsAt),
                    offerSortOrder: Number.isFinite(Number(offerSortOrder)) ? Number(offerSortOrder) : 0,
                    offerTerms: Array.isArray(offerTerms) ? offerTerms.filter(Boolean) : undefined,
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

            const createdItineraries = preparedItineraries.length > 0
                ? await Promise.all(
                    preparedItineraries.map((itinerary) =>
                        createItineraryAndActivities(tx, itinerary, tourPackageRecord.id)
                    )
                )
                : [];

            await createInitialPackageVariants(tx, {
                tourPackageId: tourPackageRecord.id,
                packageVariants: Array.isArray(packageVariants) ? packageVariants : [],
                sourceItineraries: preparedItineraries,
                createdItineraries,
            });

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
                    packageVariants: {
                        include: {
                            variantHotelMappings: {
                                include: {
                                    hotel: {
                                        include: {
                                            images: true,
                                        },
                                    },
                                    itinerary: true,
                                },
                            },
                            tourPackagePricings: {
                                include: {
                                    mealPlan: true,
                                    vehicleType: true,
                                    locationSeasonalPeriod: true,
                                    pricingComponents: {
                                        include: {
                                            pricingAttribute: true,
                                        },
                                        orderBy: {
                                            pricingAttribute: {
                                                sortOrder: 'asc',
                                            },
                                        },
                                    },
                                },
                                orderBy: {
                                    startDate: 'asc',
                                },
                            },
                        },
                        orderBy: {
                            sortOrder: 'asc',
                        },
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
        const isArchivedParam = searchParams.get('isArchived');
        const includeVariantsParam = searchParams.get('includeVariants');
        const includeCompleteParam = searchParams.get('includeComplete');
        const isFeaturedParam = searchParams.get('isFeatured');
        const limitParam = searchParams.get('limit');
        const summaryParam = searchParams.get('summary');

        const isArchived = isArchivedParam === 'true' ? true : isArchivedParam === 'false' ? false : false;
        const includeVariants = includeVariantsParam === 'true';
        const includeComplete = includeCompleteParam === 'true';
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
            isArchived,
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
                    numDaysNight: true, // Add this line
                    price: true, // Add this line
                    // remarks: true, // REMOVED
                    createdAt: true, // Add this line
                    updatedAt: true, // Add this line
                    // assignedTo: true,
                    // assignedToEmail: true,
                    isFeatured: true,
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

        const includeConfig: any = {
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
        };

        // Add flight details if complete data requested
        if (includeComplete) {
            includeConfig.flightDetails = {
                include: {
                    images: true,
                }
            };
        }

        // Add package variants if requested
        if (includeVariants || includeComplete) {
            includeConfig.packageVariants = {
                include: {
                    variantHotelMappings: {
                        include: {
                            hotel: {
                                include: {
                                    images: true,
                                }
                            },
                            itinerary: true,
                        }
                    },
                    tourPackagePricings: {
                        include: {
                            mealPlan: true,
                            vehicleType: true,
                            locationSeasonalPeriod: true,
                            pricingComponents: {
                                include: {
                                    pricingAttribute: true,
                                }
                            },
                        }
                    },
                }
            };
        }

        const tourPackage = await prismadb.tourPackage.findMany({
            where: baseWhere,
            include: includeConfig,
            orderBy,
            take: limit,
        });

        return NextResponse.json(tourPackage);
    } catch (error) {
        console.log('[TOUR_PACKAGES_GET]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
};

