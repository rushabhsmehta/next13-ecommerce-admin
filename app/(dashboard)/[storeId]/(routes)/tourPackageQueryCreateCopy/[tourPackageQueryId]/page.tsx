import prismadb from "@/lib/prismadb";

import { TourPackageQueryCreateCopyForm } from "./components/tourPackageQueryCreateCopy-form";

const tourPackageQueryPage = async ({
  params
}: {
  params: { storeId: string, tourPackageQueryId: string,  }
}) => {
  const tourPackageQuery = await prismadb.tourPackageQuery.findUnique({
    where: {
      id: params.tourPackageQueryId,
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
          days: 'asc' // or 'desc', depending on the desired order
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
        <TourPackageQueryCreateCopyForm
          initialData={tourPackageQuery}
          locations={locations}
          hotels={hotels}
          activitiesMaster={activitiesMaster}
        />
      </div>    
    </div>
  );
}
export default tourPackageQueryPage;
