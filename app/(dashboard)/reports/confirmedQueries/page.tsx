import { add, format, isValid, startOfMonth } from "date-fns";

import prismadb from "@/lib/prismadb";
import { TourPackageQueryClient } from "./components/client";
import { TourPackageQueryColumn } from "./components/columns";
import Navbar from "@/components/navbar";



const confirmedTourPackageQueryPage = async ({

}) => {
  const tourPackageQuery = await prismadb.tourPackageQuery.findMany({
    where: {
      isFeatured: true,   
    },
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
          days: 'asc' // or 'desc', depending on the desired order
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
    tourStartsFrom: item.tourStartsFrom ? format(add(item.tourStartsFrom, { hours: 5, minutes: 30 }), 'dd-MM-yyyy') : '',    //createdAt: format(item.createdAt, 'MMMM do, yyyy'),
    // createdAt: format(item.createdAt, 'MMMM do, yyyy'),
  }));

  return (
    <>
      {/*       <Navbar /> */}
      
        
        <div className="flex-col">
          <div className="flex-1 space-y-4 p-8 pt-6">
            <TourPackageQueryClient data={formattedtourPackageQuery} />
          </div>
        </div>
      
    </>
  );
};

export default confirmedTourPackageQueryPage;
