import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

import prismadb from '@/lib/prismadb';


async function createItineraryAndActivities(itinerary: { itineraryTitle: any; itineraryDescription: any; locationId: any; tourPackageId: any; dayNumber: any; days: any; hotelId: any; numberofRooms : any; roomCategory: any; mealsIncluded: any; itineraryImages: any[]; activities: any[]; }, tourPackageQueryId: any) {
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
            tourPackageQueryNumber,
            tourPackageQueryName,
            tourPackageQueryType,
            customerName,
            customerNumber,  
            numDaysNight,
            locationId,
            period,
            tour_highlights,
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
            images,
            itineraries,
            assignedTo,
            assignedToMobileNumber,
            assignedToEmail,
            purchaseDetails,
            saleDetails,
            paymentDetails,
            receiptDetails,
            expenseDetails, 
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
    */
      

        const newTourPackageQuery = await prismadb.tourPackageQuery.create({
            data: {
                tourPackageQueryNumber,
                tourPackageQueryName,
                tourPackageQueryType,
                customerName,
                customerNumber, 
                numDaysNight,
                locationId,
                period,
                tour_highlights,
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
                remarks,
                //  hotelDetails,
                inclusions,
                exclusions,
                importantNotes,
                paymentPolicy,
                usefulTip,
                cancellationPolicy,
                airlineCancellationPolicy,
                termsconditions,
                assignedTo,
                assignedToMobileNumber,
                assignedToEmail,
                purchaseDetails,
                saleDetails,
                paymentDetails,
                receiptDetails,
                expenseDetails,
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
                },
            },
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
        //  const hotelId = searchParams.get('hotelId') || undefined;
        const isFeatured = searchParams.get('isFeatured');


        const tourPackageQuery = await prismadb.tourPackageQuery.findMany({
            where: {
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
