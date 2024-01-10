import prismadb from "@/lib/prismadb";

import { TourPackageQueryCreateCopyForm } from "./components/tourPackageQueryCreateCopy-form";

const tourPackageQueryCreateCopyPage = async ({
  params
}: {
  params: { tourPackageQueryId: string, storeId: string }
}) => {
  const tourPackageQueryCreateCopy = await prismadb.tourPackageQuery.findUnique({
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
          initialData={tourPackageQueryCreateCopy}
          locations={locations}
          hotels={hotels}
          activitiesMaster={activitiesMaster}
        //    itineraries={[]}
        />
      </div>

      {/*  <div className="flex-1 space-y-4 p-8 pt-6">
        <TourPackageQueryDisplay
          data={tourPackageQuery}
          locations={locations}
          hotels={hotels}
        //    itineraries={[]}
        />
      </div> */}
    </div>


  );
}
export default tourPackageQueryCreateCopyPage;
