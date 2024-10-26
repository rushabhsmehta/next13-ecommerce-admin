import { format } from "date-fns";

import prismadb from "@/lib/prismadb";
import { formatter } from "@/lib/utils";
import { TourPackageQueryClient } from "./components/client";
import { TourPackageQueryColumn } from "./components/columns";
import Navbar from "@/components/navbar";

const tourPackageQueryPage = async ({

}) => {
  const tourPackageQuery = await prismadb.tourPackageQuery.findMany({
    
    include: {
      images: true,
      location : true,
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
    }
  });

  const formattedtourPackageQuery : TourPackageQueryColumn[] = tourPackageQuery.map((item) => ({
    id: item.id,
    tourPackageQueryName : item.tourPackageQueryName ?? '',
    tourPackageQueryType : item.tourPackageQueryType ?? '', 
    isFeatured: item.isFeatured,
    isArchived: item.isArchived,
    price: item.price ?? '',
    location: item.location.label,
    //hotel: item.hotel.name,
    createdAt: format(item.createdAt, 'MMMM do, yyyy'),
  }));

  return (
    <>
    <Navbar />
      <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <TourPackageQueryClient data={formattedtourPackageQuery} />
      </div>
    </div>
    </>
  );
};

export default tourPackageQueryPage;
