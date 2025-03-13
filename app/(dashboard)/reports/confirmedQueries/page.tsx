import { add, format, isValid, startOfMonth, parseISO, endOfMonth } from "date-fns";

import prismadb from "@/lib/prismadb";
import { TourPackageQueryClient } from "./components/client";
import { TourPackageQueryColumn } from "./components/columns";
import Navbar from "@/components/navbar";

type SearchParams = {
  startDate?: string;
  endDate?: string;
}

const confirmedTourPackageQueryPage = async ({
  searchParams
}: {
  searchParams: SearchParams
}) => {
  // Parse dates from search params
  const startDate = searchParams.startDate ? new Date(searchParams.startDate) : undefined;
  const endDate = searchParams.endDate ? new Date(searchParams.endDate) : undefined;
  
  // Validate dates
  const validStartDate = startDate && isValid(startDate) ? startDate : undefined;
  const validEndDate = endDate && isValid(endDate) ? endDate : undefined;

  // Build where clause with date filtering
  const whereClause: any = {
    isFeatured: true,
  };

  if (validStartDate && validEndDate) {
    whereClause.tourStartsFrom = {
      gte: validStartDate,
      lte: validEndDate
    };
  } else if (validStartDate) {
    whereClause.tourStartsFrom = {
      gte: validStartDate
    };
  } else if (validEndDate) {
    whereClause.tourStartsFrom = {
      lte: validEndDate
    };
  }

  const tourPackageQuery = await prismadb.tourPackageQuery.findMany({
    where: whereClause,
    include: {
      images: true,
      location: true,
      flightDetails: true,
      itineraries: {
        include: {
          itineraryImages: true,
          activities:
          {
            include:
            {
              activityImages: true,
            }
          }
        },
        orderBy: {
          days: 'asc'
        }
      }
    },
    orderBy: {
      tourStartsFrom: 'asc'
    }
  });

  const formattedtourPackageQuery: TourPackageQueryColumn[] = tourPackageQuery.map((item) => ({
    id: item.id,
    tourPackageQueryNumber: item.tourPackageQueryNumber ?? '',
    tourPackageQueryName: item.tourPackageQueryName ?? '',
    customerName: item.customerName ?? '',
    assignedTo: item.assignedTo ?? '',
    isFeatured: item.isFeatured,
    isArchived: item.isArchived,
    customerNumber: item.customerNumber ?? '',
    location: item.location.label,
    tourStartsFrom: item.tourStartsFrom ? format(add(item.tourStartsFrom, { hours: 5, minutes: 30 }), 'dd-MM-yyyy') : '',
  }));

  return (
    <>
      <div className="flex-col">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <TourPackageQueryClient 
            data={formattedtourPackageQuery} 
            startDate={searchParams.startDate}
            endDate={searchParams.endDate}
          />
        </div>
      </div>
    </>
  );
};

export default confirmedTourPackageQueryPage;
