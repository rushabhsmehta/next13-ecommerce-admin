import prismadb from "@/lib/prismadb";

import { ItineraryMasterForm } from "./components/itineraryMaster-form";
import Navbar from "@/components/navbar";



const ItineraryMasterPage = async ({
  params
}: {
  params: { itineraryMasterId: string }
}) => {
  // Use transaction to batch all database queries into a single connection
  const { itineraryMaster, activitiesMaster, locations, hotels } = await prismadb.$transaction(async (tx) => {
    const itineraryMaster = await tx.itineraryMaster.findUnique({
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

    const activitiesMaster = await tx.activityMaster.findMany({
      include: {
        activityMasterImages: true,
      },
    });

    const locations = await tx.location.findMany({});

    const hotels = await tx.hotel.findMany({});
    
    return { itineraryMaster, activitiesMaster, locations, hotels };
  });


  return (
    <>{/*       <Navbar /> */}
      
        
        <div className="flex-col">
          <div className="flex-1 space-y-4 p-8 pt-6">
            <ItineraryMasterForm
              hotels={hotels}
              locations={locations}
              activitiesMaster={activitiesMaster}
              initialData={itineraryMaster}
            />
          </div>
        </div>
      
    </>
  );
}

export default ItineraryMasterPage;
