import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

import prismadb from '@/lib/prismadb';
export const dynamic = 'force-dynamic';

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

        const tourPackage = await prismadb.tourPackage.findMany({
            where: {
                storeId: params.storeId,
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
