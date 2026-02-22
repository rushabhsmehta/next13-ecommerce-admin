import { add, format, isValid, startOfMonth, parseISO } from "date-fns";

import prismadb from "@/lib/prismadb";
import { TourPackageQueryClient } from "./components/client";
import { TourPackageQueryColumn } from "./components/columns";
import Navbar from "@/components/navbar";

interface UpcomingTripsPageProps {
  searchParams: {
    startDate?: string;
    endDate?: string;
  }
}


const confirmedTourPackageQueryPage = async ({
  searchParams
}: UpcomingTripsPageProps) => {
  // Get current date to filter out trips that have already ended
  const currentDate = new Date();

  // Parse and validate date filters
  const startDate = searchParams?.startDate ? new Date(searchParams.startDate) : startOfMonth(new Date());
  const endDate = searchParams?.endDate ? new Date(searchParams.endDate) : null;

  // Use validated dates for filtering
  const validStartDate = isValid(startDate) ? startDate : startOfMonth(new Date());

  // Create where condition based on dates, filtering on tourEndsOn to include ongoing trips
  const whereCondition: any = {
    isFeatured: true,
    // Filter by tourEndsOn to keep showing ongoing trips
    tourEndsOn: {
      gte: currentDate, // Show trips that end today or in the future
    },
    // Still use start date filter from search params if provided
    tourStartsFrom: {
      gte: validStartDate,
    },
  };

  // Add end date to filter if provided
  if (endDate && isValid(endDate)) {
    whereCondition.tourStartsFrom.lte = endDate;
  }

  const tourPackageQuery = await prismadb.tourPackageQuery.findMany({
    where: whereCondition,
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
            startDate={searchParams?.startDate}
            endDate={searchParams?.endDate}
          />
        </div>
      </div>
    </>
  );
};

export default confirmedTourPackageQueryPage;

