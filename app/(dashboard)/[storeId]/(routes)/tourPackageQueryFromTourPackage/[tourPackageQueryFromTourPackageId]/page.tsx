import prismadb from "@/lib/prismadb";
import { TourPackageQueryFromTourPackageForm } from "./components/tourPackageQueryFromTourPackage-form";


const tourPackageQueryFromTourPackagePage = async ({
  params
}: {
  params: { tourPackageQueryFromTourPackageId: string, storeId: string  }
}) => {
  const tourPackage = await prismadb.tourPackage.findUnique({
    where: {
      id: params.tourPackageQueryFromTourPackageId,
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
          dayNumber :  'asc' // or 'desc', depending on the desired order
        }
      }
    }
  });
  // console.log("Fetched tourPackage Query:", tourPackageQuery);

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
        <TourPackageQueryFromTourPackageForm
          initialData={tourPackage}
          locations={locations}
          hotels={hotels}
          activitiesMaster={activitiesMaster}
        />
      </div>    
    </div>
  );
}
export default tourPackageQueryFromTourPackagePage;
