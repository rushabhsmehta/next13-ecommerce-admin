import prismadb from "@/lib/prismadb";

import { TourPackageQueryForm } from "./components/tourPackageQuery-form";
import { Turret_Road } from "next/font/google";
import Navbar from "@/components/navbar";

const tourPackageQueryPage = async ({
  params
}: {
  params: { tourPackageQueryId: string }
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
          dayNumber: 'asc' // or 'desc', depending on the desired order
        }
      }
    }
  });
  // console.log("Fetched tourPackage Query:", tourPackageQuery);

  const locations = await prismadb.location.findMany({
    
  });

  const hotels = await prismadb.hotel.findMany({
    
  });

  const activitiesMaster = await prismadb.activityMaster.findMany({
    
    include: {
      activityMasterImages: true,
    },
  }
  );

  console.log("Tour Package Query Location ID : ", tourPackageQuery?.locationId);
  const itinerariesMaster = await prismadb.itineraryMaster.findMany({   
    
    where : {
      locationId : tourPackageQuery?.locationId ?? '',
    },
    include: {
      itineraryMasterImages: true,
      activities: {
        include: {
          activityImages: true,
        }
      },
    }
  });

  return (
    <><Navbar /><div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <TourPackageQueryForm
          initialData={tourPackageQuery}
          locations={locations}
          hotels={hotels}
          activitiesMaster={activitiesMaster}
          itinerariesMaster = {itinerariesMaster} />
      </div>

      {/*  <div className="flex-1 space-y-4 p-8 pt-6">
      <TourPackageQueryDisplay
        data={tourPackageQuery}
        locations={locations}
        hotels={hotels}
      //    itineraries={[]}
      />
    </div> */}
    </div></>


  );
}
export default tourPackageQueryPage;
