import { format } from "date-fns";

import prismadb from "@/lib/prismadb";
import { formatter } from "@/lib/utils";
import { TourPackagesClient } from "./components/client";
import { TourPackageColumn } from "./components/columns";
import Navbar from "@/components/navbar";

const tourPackagesPage = async ({
  params
}: {
  params: { storeId: string }
}) => {
  const tourPackages = await prismadb.tourPackage.findMany({
    where: {
      storeId: params.storeId
    },
    include: {
      location: true,
    //  hotel : true,
   
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const formattedtourPackages: TourPackageColumn[] = tourPackages.map((item) => ({
    id: item.id,
    tourPackageName: item.tourPackageName ?? '',
    isFeatured: item.isFeatured,
    isArchived: item.isArchived,
    price: item.price ?? '',
    location: item.location.label,
  //  hotel: item.hotel.name,
    createdAt: format(item.createdAt, 'MMMM do, yyyy'),
  }));

  return (
    <>
    <Navbar />
      <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <TourPackagesClient data={formattedtourPackages} />
      </div>
    </div>
    </>
  );
};

export default tourPackagesPage;
