import { format } from "date-fns";

import prismadb from "@/lib/prismadb";
import { formatter } from "@/lib/utils";
import { TourPackageClient } from "./components/client";
import { TourPackageColumn } from "./components/columns";
import Navbar from "@/components/navbar";

const tourPackagePage = async ({

}) => {
  const tourPackage = await prismadb.tourPackage.findMany({
    
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

  const formattedtourPackage : TourPackageColumn[] = tourPackage.map((item) => ({
    id: item.id,
    tourPackageName : item.tourPackageName ?? '',
    tourPackageType : item.tourPackageType ?? '',
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
        <TourPackageClient data={formattedtourPackage} />
      </div>
    </div>
    </>
  );
};

export default tourPackagePage;
