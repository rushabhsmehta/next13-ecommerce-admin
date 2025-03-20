import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

import prismadb from '@/lib/prismadb';
export const dynamic = 'force-dynamic';

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
                isFeatured: true,
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

        return NextResponse.json(tourPackage);
    } catch (error) {
        console.log('[TOUR_PACKAGES_GET]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
};

