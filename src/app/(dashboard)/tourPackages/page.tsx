import { format } from "date-fns";
import { formatLocalDate } from "@/lib/timezone-utils";

import prismadb from "@/lib/prismadb";
import { TourPackagesClient } from "./components/client";
import { TourPackageColumn } from "./components/columns";
import Navbar from "@/components/navbar";
import { isCurrentUserAssociate } from "@/lib/associate-utils";

const tourPackagesPage = async ({

}) => {
  const tourPackages = await prismadb.tourPackage.findMany({
    select: {
      id: true,
      tourPackageName: true,
      tourPackageType: true,
      tourCategory: true,
      isFeatured: true,
      isArchived: true,
      price: true,
      createdAt: true,
      updatedAt: true,
      location: {
        select: {
          label: true
        }
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  // Check if current user is an associate (for read-only mode)
  const isAssociate = await isCurrentUserAssociate();

  const formattedtourPackages: TourPackageColumn[] = tourPackages.map((item) => ({
    id: item.id,
    tourPackageName: item.tourPackageName ?? '',
    tourPackageType: item.tourPackageType ?? '',
    tourCategory: item.tourCategory ?? 'Domestic',
    isFeatured: item.isFeatured,
    isArchived: item.isArchived,
    price: item.price ?? '',
    location: item.location.label,    //  hotel: item.hotel.name,
    createdAt: formatLocalDate(item.createdAt, 'MMMM d, yyyy'),
    updatedAt: formatLocalDate(item.updatedAt, 'MMMM d, yyyy'),
  }));

  return (
    <>
      {/*       <Navbar /> */}
      
      <div className="flex-col">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <TourPackagesClient data={formattedtourPackages} readOnly={isAssociate} />
        </div>
      </div>
      
    </>
  );
};

export default tourPackagesPage;

