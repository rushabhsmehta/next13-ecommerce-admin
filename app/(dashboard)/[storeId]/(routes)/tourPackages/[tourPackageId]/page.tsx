import prismadb from "@/lib/prismadb";

import { TourPackageForm } from "./components/tourPackage-form";

const tourPackagePage = async ({
  params
}: {
  params: { tourPackageId: string, storeId: string }
}) => {
  const tourPackage = await prismadb.tourPackage.findUnique({
    where: {
      id: params.tourPackageId,
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
          dayNumber : 'asc' // or 'desc', depending on the desired order
        }
      }
    }
  }
  );
      
  
  console.log("Fetched tourPackage:", tourPackage);

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
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <TourPackageForm
          initialData={tourPackage}
          locations={locations}
          hotels={hotels}
          activitiesMaster={activitiesMaster}

      //    itineraries={[]}
        />
      </div>
    </div>
  );
}

export default tourPackagePage;
