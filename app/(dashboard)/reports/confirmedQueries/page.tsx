import { add, format, isValid, startOfMonth, parseISO, endOfMonth, startOfYear, endOfYear } from "date-fns";

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
  // Get current year dates if no dates are provided
  const currentYear = new Date().getFullYear();
  const defaultStartDate = startOfYear(new Date(currentYear, 0, 1));
  const defaultEndDate = endOfYear(new Date(currentYear, 0, 1));
  
  // Parse dates from search params or use defaults
  const startDate = searchParams.startDate ? new Date(searchParams.startDate) : defaultStartDate;
  const endDate = searchParams.endDate ? new Date(searchParams.endDate) : defaultEndDate;
  
  // Validate dates
  const validStartDate = startDate && isValid(startDate) ? startDate : defaultStartDate;
  const validEndDate = endDate && isValid(endDate) ? endDate : defaultEndDate;

  // Build where clause with date filtering
  const whereClause: any = {
    isFeatured: true,
    tourStartsFrom: {
      gte: validStartDate,
      lte: validEndDate
    }
  };

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

  // Format the default dates for the client component
  const formattedStartDate = format(validStartDate, 'yyyy-MM-dd');
  const formattedEndDate = format(validEndDate, 'yyyy-MM-dd');

  return (
    <>
      <div className="flex-col">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <TourPackageQueryClient 
            data={formattedtourPackageQuery} 
            startDate={searchParams.startDate || formattedStartDate}
            endDate={searchParams.endDate || formattedEndDate}
          />
        </div>
      </div>
    </>
  );
};

export default confirmedTourPackageQueryPage;
