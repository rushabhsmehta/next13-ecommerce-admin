import prismadb from "@/lib/prismadb";

import { ItineraryMasterForm } from "./components/itineraryMaster-form";
import Navbar from "@/components/navbar";

const ItineraryMasterPage = async ({
  params
}: {
  params: { itineraryMasterId: string }
}) => {
  const itineraryMaster = await prismadb.itineraryMaster.findUnique({
    where: {
      id: params.itineraryMasterId
    },
    include: {
      location: true,
      hotel: true,
      itineraryMasterImages: true,
      activities:
      {
        include: {
          activityImages: true,
        }
      }
    }
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

  const locations = await prismadb.location.findMany({
   
  });

  const hotels = await prismadb.hotel.findMany({
    where: {
      storeId: params.storeId,
    },
  });


  return (
    <><Navbar /><div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <ItineraryMasterForm
          hotels={hotels}
          locations={locations}
          activitiesMaster={activitiesMaster}
          initialData={itineraryMaster}
           />
      </div>
    </div></>
  );
}

export default ItineraryMasterPage;
