import { format } from "date-fns";
import { formatLocalDate } from "@/lib/timezone-utils";

import prismadb from "@/lib/prismadb";
import { TourPackagesClient } from "./components/client";
import { TourPackageColumn } from "./components/columns";
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
      numDaysNight: true,
      websiteSortOrder: true,
      createdAt: true,
      updatedAt: true,
      location: {
        select: {
          id: true,
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
    location: item.location.label,
    duration: item.numDaysNight ?? 'Not specified',
    websiteSortOrder: item.websiteSortOrder ?? 0,
    createdAt: formatLocalDate(item.createdAt, 'MMMM d, yyyy'),
    updatedAt: formatLocalDate(item.updatedAt, 'MMMM d, yyyy'),
  }));

  // Group tour packages by Location → Category → Duration
  const groupedTourPackages = tourPackages.reduce((acc, tourPackage) => {
    const location = tourPackage.location.label;
    const category = tourPackage.tourCategory || 'Domestic';
    const duration = tourPackage.numDaysNight || 'Not specified';

    if (!acc[location]) {
      acc[location] = {};
    }
    if (!acc[location][category]) {
      acc[location][category] = {};
    }
    if (!acc[location][category][duration]) {
      acc[location][category][duration] = [];
    }

    acc[location][category][duration].push({
      id: tourPackage.id,
      tourPackageName: tourPackage.tourPackageName ?? '',
      tourPackageType: tourPackage.tourPackageType ?? '',
      tourCategory: tourPackage.tourCategory ?? 'Domestic',
      isFeatured: tourPackage.isFeatured,
      isArchived: tourPackage.isArchived,
      price: tourPackage.price ?? '',
      location: tourPackage.location.label,
      duration: tourPackage.numDaysNight ?? 'Not specified',
      websiteSortOrder: tourPackage.websiteSortOrder ?? 0,
      createdAt: formatLocalDate(tourPackage.createdAt, 'MMMM d, yyyy'),
      updatedAt: formatLocalDate(tourPackage.updatedAt, 'MMMM d, yyyy'),
    });

    return acc;
  }, {} as Record<string, Record<string, Record<string, TourPackageColumn[]>>>);

  return (
    <>
      {/*       <Navbar /> */}

      <div className="flex-col">
        <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
          <TourPackagesClient
            data={formattedtourPackages}
            groupedData={groupedTourPackages}
            readOnly={isAssociate}
          />
        </div>
      </div>

    </>
  );
};

export default tourPackagesPage;

