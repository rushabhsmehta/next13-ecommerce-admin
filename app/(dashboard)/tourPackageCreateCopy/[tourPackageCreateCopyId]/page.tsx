import prismadb from "@/lib/prismadb";

import { TourPackageCreateCopyForm } from "./components/tourPackageCreateCopy-form";
import Navbar from "@/components/navbar";

const tourPackagePage = async ({
  params
}: {
  params: { tourPackageCreateCopyId: string }
}) => {
  const tourPackage = await prismadb.tourPackage.findUnique({
    where: {
      id: params.tourPackageCreateCopyId,
    },
    include: {
      images: true,
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
          dayNumber: 'asc' // or 'desc', depending on the desired order
        }
      }
    }
  });
  // console.log("Fetched tourPackage :", tourPackage);

  const locations = await prismadb.location.findMany({
    where: {
      storeId: params.storeId,
    },
  });

  const hotels = await prismadb.hotel.findMany({
    where: {
      storeId: params.storeId,
    },
  });

  const activitiesMaster = await prismadb.activityMaster.findMany({
    where: {
      storeId: params.storeId,
    },
    include: {
      activityMasterImages: true,
    },
  }
  );

  return (
    <><Navbar /><div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <TourPackageCreateCopyForm
          initialData={tourPackage}
          locations={locations}
          hotels={hotels}
          activitiesMaster={activitiesMaster} />
      </div>
    </div></>
  );
}
export default tourPackagePage;
