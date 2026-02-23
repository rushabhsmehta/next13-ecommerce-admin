import prismadb from "@/lib/prismadb";

import { TourPackageQueryVariantDisplay } from "./components/tourPackageQueryVariantDisplay";
import Link from "next/link";

const tourPackageQueryVariantPage = async (
    props: {
        params: Promise<{ tourPackageQueryId: string }>;
        searchParams?: Promise<Record<string, string | string[] | undefined>>;
    }
) => {
    const searchParams = await props.searchParams;
    const params = await props.params;
    const selectedOptionParam = searchParams?.search;
    const selectedOption = Array.isArray(selectedOptionParam)
        ? selectedOptionParam[0]
        : selectedOptionParam;
    const preferredOption = selectedOption && selectedOption.length ? selectedOption : "AH";
    const tourPackageQuery = await prismadb.tourPackageQuery.findUnique({
        where: {
            id: params.tourPackageQueryId,
        },
        include: {
            images: true,
            flightDetails: {
                include: {
                    images: true,
                },
                orderBy: {
                    createdAt: 'asc',
                },
            },
            itineraries: {
                include: {
                    itineraryImages: true,
                    roomAllocations: {
                        include: {
                            roomType: true,
                            occupancyType: true,
                            mealPlan: true,
                        },
                        orderBy: {
                            createdAt: 'asc',
                        },
                    },
                    transportDetails: {
                        include: {
                            vehicleType: true,
                        },
                        orderBy: {
                            createdAt: 'asc',
                        },
                    },
                    activities: {
                        include: {
                            activityImages: true,
                        },
                        orderBy: {
                            createdAt: 'asc',
                        },
                    },
                },
                orderBy: {
                    dayNumber: 'asc',
                }
            },
            associatePartner: true,
            queryVariantSnapshots: {
                include: {
                    hotelSnapshots: {
                        orderBy: {
                            dayNumber: 'asc',
                        },
                    },
                    pricingSnapshots: {
                        include: {
                            pricingComponentSnapshots: {
                                orderBy: {
                                    createdAt: 'asc',
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    sortOrder: 'asc',
                },
            },
        }
    });

    const locations = await prismadb.location.findMany({});

    const hotels = await prismadb.hotel.findMany({
        include: {
            images: true,
            location: true,
            destination: true,
        }
    });

    const associatePartners = await prismadb.associatePartner.findMany();

    const roomTypes = await prismadb.roomType.findMany({});
    const occupancyTypes = await prismadb.occupancyType.findMany({});
    const mealPlans = await prismadb.mealPlan.findMany({});
    const vehicleTypes = await prismadb.vehicleType.findMany({});

    // Find latest CREATE audit log entry for this entity (prepared by)
    const preparedByLog = await prismadb.auditLog.findFirst({
        where: {
            entityId: params.tourPackageQueryId,
            entityType: "TourPackageQuery",
            action: "CREATE",
        },
        orderBy: { createdAt: 'desc' },
    });

    return (
        <>
            <div className="flex-col">
                <div className="flex-1 space-y-4 p-8 pt-6">
                    {preparedByLog && (
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600">Prepared by: <span className="font-semibold">{preparedByLog.userName}</span> <span className="ml-2">({preparedByLog.userEmail})</span></div>
                            {tourPackageQuery && (
                                <Link
                                    href={`/tourPackageQueryPDFGeneratorWithVariants/${tourPackageQuery.id}?search=${preferredOption}`}
                                    className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium bg-orange-500 text-white hover:bg-orange-600"
                                >
                                    Download PDF with Variants
                                </Link>
                            )}
                        </div>
                    )}
                    <TourPackageQueryVariantDisplay
                        initialData={tourPackageQuery}
                        locations={locations}
                        hotels={hotels}
                        associatePartners={associatePartners}
                        roomTypes={roomTypes}
                        occupancyTypes={occupancyTypes}
                        mealPlans={mealPlans}
                        vehicleTypes={vehicleTypes}
                    />
                </div>
            </div>
        </>
    );
}
export default tourPackageQueryVariantPage;
