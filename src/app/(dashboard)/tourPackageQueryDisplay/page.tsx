import { format } from "date-fns";
import { formatLocalDate } from "@/lib/timezone-utils";

import prismadb from "@/lib/prismadb";
import { TourPackageQueryDisplayClient } from "./components/client";
import { TourPackageQueryDisplayColumn } from "./components/columns";
import { isCurrentUserAssociate } from "@/lib/associate-utils";

// Enable ISR - revalidate every 5 minutes (300 seconds)
export const revalidate = 300;

const TourPackageQueryDisplayPage = async () => {
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
    // For associates, you might want to filter based on their association
    // This is a placeholder - you'll need to implement the proper filtering logic
    // based on how you determine which queries belong to which associate
  }

  const formattedTourPackageQueries: TourPackageQueryDisplayColumn[] = filteredQueries.map((item) => ({
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
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <TourPackageQueryDisplayClient data={formattedTourPackageQueries} readOnly={isAssociate} />
      </div>
    </div>
  );
};

export default TourPackageQueryDisplayPage;
