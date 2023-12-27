import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

import prismadb from '@/lib/prismadb';

export async function POST(
    req: Request,
    { params }: { params: { storeId: string } }
) {
    try {
        const { userId } = auth();

        const body = await req.json();

        const {
            tourPackageQueryName,
            customerName,
            numDaysNight,
            locationId,
            period,
            numAdults,
            numChild5to12,
            numChild0to5,
            price,
            flightDetails,
            inclusions,
            exclusions,
            paymentPolicy,
            usefulTip,
            cancellationPolicy,
            airlineCancellationPolicy,
            termsconditions,
            images,
            itineraries,
            assignedTo,
            assignedToMobileNumber,
            assignedToEmail,
            isFeatured,
            isArchived } = body;

        if (!userId) {
            return new NextResponse("Unauthenticated", { status: 403 });
        }

        if (!tourPackageQueryName) {
            return new NextResponse("Tour Package Query Name is required", { status: 400 });
        }

        if (!images || !images.length) {
            return new NextResponse("Images are required", { status: 400 });
        }

        if (!price) {
            return new NextResponse("Price is required", { status: 400 });
        }

        if (!locationId) {
            return new NextResponse("Location id is required", { status: 400 });
        }

        /*    if (!hotelId) {
               return new NextResponse("Hotel id is required", { status: 400 });
           }
    */
        if (!params.storeId) {
            return new NextResponse("Store id is required", { status: 400 });
        }

        const storeByUserId = await prismadb.store.findFirst({
            where: {
                id: params.storeId,
                userId
            }
        });

        if (!storeByUserId) {
            return new NextResponse("Unauthorized", { status: 405 });
        }

        const tourPackageQuery = await prismadb.tourPackageQuery.create({
            data: {
                tourPackageQueryName,
                customerName,
                numDaysNight,
                locationId,
                period,
                numAdults,
                numChild5to12,
                numChild0to5,
                price,
                //  hotelDetails,
                inclusions,
                exclusions,
                paymentPolicy,
                usefulTip,
                cancellationPolicy,
                airlineCancellationPolicy,
                termsconditions,
                assignedTo,
                assignedToMobileNumber,
                assignedToEmail,
                //   hotelId,
                storeId: params.storeId,
                images: {
                    createMany: {
                        data: [
                            ...images.map((image: { url: string }) => image),
                        ],
                    },
                },

                itineraries: {
                    create: itineraries.map((itinerary: { locationId: string, itineraryTitle: string; itineraryDescription: string; days: string; hotelId: string; mealsIncluded: string; itineraryImages: { url: string }[]; activities: { storeId: string; locationId: string; title: string, description: string, activityImages: { url: string }[], }[]; }) => ({
                        
                        storeId: params.storeId,
                        locationId: itinerary.locationId,

                        itineraryTitle: itinerary.itineraryTitle,
                        itineraryDescription: itinerary.itineraryDescription,
                        days: itinerary.days,
                        hotelId: itinerary.hotelId,
                        mealsIncluded: itinerary.mealsIncluded,
                        itineraryImages: {
                            createMany: {
                                data: itinerary.itineraryImages.map((img: { url: string; }) => ({ url: img.url })),
                            },
                        },
                        activities: {
                            create: itinerary.activities.map((activity: { locationId: string; title: string; description: string; activityImages: { url: string }[]; }) => ({
                                storeId: params.storeId,
                                locationId: activity.locationId,
                                title: activity.title,
                                description: activity.description,
                                activityImages: {
                                    createMany: {
                                        data: activity.activityImages.map((img: { url: string; }) => ({ url: img.url })),
                                    },
                                },
                            })),
                        },
                    })),
                },

                flightDetails: {
                    createMany: {
                        data: [
                            ...flightDetails.map((flightDetail: { date: string, flightName: string, flightNumber: string, from: string, to: string, departureTime: string, arrivalTime: string, flightDuration: string }) => flightDetail),]
                    }
                },
            },
        });

        return NextResponse.json(tourPackageQuery);
    } catch (error) {
        console.log('[TOURPACKAGE_QUERY_POST]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
};

export async function GET(
    req: Request,
    { params }: { params: { storeId: string } },
) {
    try {
        const { searchParams } = new URL(req.url)
        const locationId = searchParams.get('locationId') || undefined;
        //  const hotelId = searchParams.get('hotelId') || undefined;
        const isFeatured = searchParams.get('isFeatured');

        if (!params.storeId) {
            return new NextResponse("Store id is required", { status: 400 });
        }

        const tourPackageQuery = await prismadb.tourPackageQuery.findMany({
            where: {
                storeId: params.storeId,
                locationId,
                //hotelId,
                isFeatured: isFeatured ? true : undefined,
                isArchived: false,
            },
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
