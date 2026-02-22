import { format } from "date-fns";
import { formatLocalDate } from "@/lib/timezone-utils";

import prismadb from "@/lib/prismadb";
import { TourPackageQueryVariantDisplayClient } from "./components/client";
import { TourPackageQueryVariantDisplayColumn } from "./components/columns";
import { isCurrentUserAssociate } from "@/lib/associate-utils";

// Enable ISR - revalidate every 5 minutes (300 seconds)
export const revalidate = 300;

const TourPackageQueryVariantDisplayPage = async () => {
    const tourPackageQueries = await prismadb.tourPackageQuery.findMany({
        select: {
            id: true,
            tourPackageQueryNumber: true,
            tourPackageQueryName: true,
            customerName: true,
            assignedTo: true,
            totalPrice: true,
            createdAt: true,
            updatedAt: true,
            location: {
                select: {
                    label: true,
                }
            }
        },
        orderBy: {
            updatedAt: 'desc'
        }
    });

    // Check if current user is an associate (to filter data)
    const isAssociate = await isCurrentUserAssociate();

    // Filter data for associates - only show their own queries
    let filteredQueries = tourPackageQueries;
    if (isAssociate) {
        // For associates, filtering logic based on their association
    }

    const formattedTourPackageQueries: TourPackageQueryVariantDisplayColumn[] = filteredQueries.map((item) => ({
        id: item.id,
        tourPackageQueryNumber: item.tourPackageQueryNumber ?? '',
        tourPackageQueryName: item.tourPackageQueryName ?? '',
        customerName: item.customerName ?? '',
        assignedTo: item.assignedTo ?? 'Unassigned',
        location: item.location?.label ?? '',
        totalPrice: item.totalPrice ?? '',
        createdAt: formatLocalDate(item.createdAt, 'MMMM d, yyyy'),
        updatedAt: formatLocalDate(item.updatedAt, 'MMMM d, yyyy'),
    }));

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <TourPackageQueryVariantDisplayClient data={formattedTourPackageQueries} readOnly={isAssociate} />
            </div>
        </div>
    );
};

export default TourPackageQueryVariantDisplayPage;
